"use client";

import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  FREE_TEMPLATE_LIMIT,
  PROFILE_PLAN,
  createDefaultBillingState,
  getQuotaSnapshot,
  loadBillingState,
  registerAsFree,
  saveBillingState,
  saveTemplate,
  tryConsumeGeneration,
  upgradeToPro,
  type BillingState,
  type ConsumeSource,
  type PlanId,
  type QuotaSnapshot,
} from "@/lib/billing";
import {
  getDevPersona,
  isDevPersonaEnabled,
  setDevPersona as persistDevPersona,
  subscribeDevPersona,
  type DevPersona,
} from "@/lib/billing/dev-persona";
import {
  loadFreeCreditsFromServer,
  persistAnalyticsProfile,
} from "@/lib/analytics-profile-client";
import { useAuth } from "@/components/auth-provider";

type BillingContextValue = {
  ready: boolean;
  state: BillingState;
  quota: QuotaSnapshot;
  paywallOpen: boolean;
  openPaywall: () => void;
  closePaywall: () => void;
  pricingOpen: boolean;
  openPricing: () => void;
  closePricing: () => void;
  reserveGeneration: () =>
    | { ok: true; source: ConsumeSource }
    | { ok: false };
  rollbackReservation: (source: ConsumeSource) => void;
  upgradePro: () => void;
  becomeFreeUser: () => void;
  setPlanForDemo: (plan: PlanId) => void;
  devPersona: DevPersona | null;
  setDevPersona: (persona: DevPersona | null) => void;
  setStripeCustomerId: (customerId: string | null) => void;
  trySaveTemplate: (
    name: string,
    payload: Record<string, unknown>,
  ) => { ok: true } | { ok: false; reason: "template_limit" };
  /** Pro 1回お試しを開始（UI解放のみ。DB消費は Pro API 成功時） */
  startProTrial: () => Promise<boolean>;
  /** 課金 Pro またはお試しで解放できれば true */
  ensureProTrialOrPaid: () => Promise<boolean>;
  /** お試しセッションを終了（次回からモザイク。残枠は戻さない） */
  endProTrialSession: () => void;
  /** DB の free_credits を再取得して反映 */
  refreshFreeCredits: () => Promise<void>;
  /** Pro API レスポンスの remainingCredits を即時反映 */
  applyRemainingCredits: (remainingCredits: number) => void;
};

const BillingContext = createContext<BillingContextValue | null>(null);

function applyDevPersonaToState(
  state: BillingState,
  persona: DevPersona | null,
): BillingState {
  if (!persona) return state;
  if (persona === "unauthenticated") {
    return {
      ...state,
      plan: "visitor",
      hasUsedProTrial: true,
      freeCredits: 0,
    };
  }
  if (persona === "free") {
    return {
      ...state,
      plan: "free",
      hasUsedProTrial: false,
      freeCredits: 1,
    };
  }
  return { ...state, plan: "pro", freeCredits: 0, hasUsedProTrial: true };
}

export function BillingProvider({ children }: { children: ReactNode }) {
  const { user, ready: authReady, welcomeOpen } = useAuth();
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<BillingState>(() =>
    createDefaultBillingState("visitor"),
  );
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [devPersona, setDevPersonaState] = useState<DevPersona | null>(null);
  const [proTrialActive, setProTrialActive] = useState(false);
  const stateRef = useRef(state);
  const trialConsumingRef = useRef(false);
  const welcomeWasOpenRef = useRef(false);

  const persist = useCallback((next: BillingState) => {
    const freeCredits = Math.max(0, Math.floor(next.freeCredits ?? 0));
    const normalized: BillingState = {
      ...next,
      freeCredits,
      hasUsedProTrial: freeCredits <= 0 || Boolean(next.hasUsedProTrial),
    };
    stateRef.current = normalized;
    setState(normalized);
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const loaded = loadBillingState();
    startTransition(() => {
      setState(loaded);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!isDevPersonaEnabled()) return;
    setDevPersonaState(getDevPersona());
    return subscribeDevPersona((next) => {
      setDevPersonaState(next);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    saveBillingState(state);
  }, [state, ready]);

  const refreshFreeCredits = useCallback(async () => {
    if (!user?.id) return;
    const remote = await loadFreeCreditsFromServer(user.id);
    if (!remote) return;

    const current = stateRef.current;
    const nextPlan =
      current.plan === "visitor" || current.plan === "free"
        ? ("free" as const)
        : current.plan;

    persist({
      ...current,
      plan: nextPlan === "premium" ? "pro" : nextPlan,
      freeCredits: remote.freeCredits,
      hasUsedProTrial: remote.hasUsedProTrial,
    });

    if (remote.hasUsedProTrial) {
      setProTrialActive(false);
    }
  }, [persist, user?.id]);

  const applyRemainingCredits = useCallback(
    (remainingCredits: number) => {
      const credits = Math.max(0, Math.floor(remainingCredits));
      persist({
        ...stateRef.current,
        freeCredits: credits,
        hasUsedProTrial: credits <= 0,
      });
      if (credits <= 0) {
        setProTrialActive(false);
      }
    },
    [persist],
  );

  // ログイン済みなら visitor → free へ昇格し、free_credits をサーバー同期
  useEffect(() => {
    if (!ready || !authReady) return;
    if (!user?.id) {
      setProTrialActive(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      const remote = await loadFreeCreditsFromServer(user.id);
      if (cancelled) return;

      const current = stateRef.current;
      const nextPlan =
        current.plan === "visitor" || current.plan === "free"
          ? ("free" as const)
          : current.plan;

      if (remote == null) {
        // DB 取得失敗時はローカルの「消費済み」でサーバを上書きしない
        if (current.plan === "visitor") {
          persist({
            ...current,
            plan: "free",
            // 新規ログイン直後は残り1を優先（汚染 localStorage を捨てる）
            freeCredits: 1,
            hasUsedProTrial: false,
          });
        }
        return;
      }

      persist({
        ...current,
        plan: nextPlan === "premium" ? "pro" : nextPlan,
        freeCredits: remote.freeCredits,
        hasUsedProTrial: remote.hasUsedProTrial,
      });

      if (remote.hasUsedProTrial) setProTrialActive(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, authReady, user?.id, persist]);

  // 認証完了モーダルを閉じたタイミングで DB 最新値を再取得
  useEffect(() => {
    if (welcomeOpen) {
      welcomeWasOpenRef.current = true;
      return;
    }
    if (welcomeWasOpenRef.current && user?.id) {
      welcomeWasOpenRef.current = false;
      void refreshFreeCredits();
    }
  }, [welcomeOpen, user?.id, refreshFreeCredits]);

  const effectiveState = useMemo(
    () => applyDevPersonaToState(state, devPersona),
    [state, devPersona],
  );

  const isAuthenticated =
    Boolean(user) || devPersona === "free" || devPersona === "paid";

  const quota = useMemo(
    () =>
      getQuotaSnapshot(effectiveState, {
        proTrialActive,
        isAuthenticated,
      }),
    [effectiveState, proTrialActive, isAuthenticated],
  );

  const openPaywall = useCallback(() => setPaywallOpen(true), []);
  const closePaywall = useCallback(() => setPaywallOpen(false), []);
  const openPricing = useCallback(() => setPricingOpen(true), []);
  const closePricing = useCallback(() => setPricingOpen(false), []);

  const reserveGeneration = useCallback(() => {
    const result = tryConsumeGeneration(
      applyDevPersonaToState(stateRef.current, getDevPersona()),
    );
    if (!result.ok) {
      setPaywallOpen(true);
      return { ok: false as const };
    }
    if (!getDevPersona()) {
      persist(result.state);
    }
    return { ok: true as const, source: result.source };
  }, [persist]);

  useEffect(() => {
    if (!ready) return;
    if (quota.isPaidPro && paywallOpen) {
      setPaywallOpen(false);
    }
  }, [ready, quota.isPaidPro, paywallOpen]);

  const rollbackReservation = useCallback(
    (_source: ConsumeSource) => {
      // 基本生成は無制限のためロールバック不要
    },
    [],
  );

  const setPlanForDemo = useCallback(
    (plan: PlanId) => {
      const normalized = plan === "premium" ? "pro" : plan;
      const current = stateRef.current;
      persist({
        ...createDefaultBillingState(normalized),
        ticketBalance: normalized === "pro" ? 0 : current.ticketBalance,
        stripeCustomerId: current.stripeCustomerId,
        freeCredits: normalized === "free" ? 1 : 0,
        hasUsedProTrial: normalized !== "free",
        templates:
          normalized === "visitor"
            ? []
            : current.templates.slice(
                0,
                normalized === "free" ? FREE_TEMPLATE_LIMIT : undefined,
              ),
      });
      setPaywallOpen(false);
      setProTrialActive(false);
      if (normalized === "free") {
        persistAnalyticsProfile({
          plan_type: PROFILE_PLAN.free,
          free_credits: 1,
          has_used_pro_trial: false,
        });
      } else if (normalized === "pro") {
        persistAnalyticsProfile({ plan_type: PROFILE_PLAN.paid, free_credits: 0 });
      }
    },
    [persist],
  );

  const setDevPersona = useCallback(
    (persona: DevPersona | null) => {
      persistDevPersona(persona);
      setDevPersonaState(persona);
      if (persona === "unauthenticated") {
        setPlanForDemo("visitor");
      } else if (persona === "free") {
        setPlanForDemo("free");
      } else if (persona === "paid") {
        setPlanForDemo("pro");
      }
    },
    [setPlanForDemo],
  );

  const startProTrial = useCallback(async () => {
    const persona = getDevPersona();
    const authenticated =
      Boolean(user) || persona === "free" || persona === "paid";

    // 開始直前に DB 最新を取りにいく（localStorage 汚染対策）
    if (user?.id && persona !== "free") {
      await refreshFreeCredits();
    }

    const snap = getQuotaSnapshot(
      applyDevPersonaToState(stateRef.current, persona),
      { proTrialActive, isAuthenticated: authenticated },
    );

    if (snap.isPaidPro) return true;
    if (proTrialActive) return true;
    if (snap.freeCredits <= 0 || snap.hasUsedProTrial) return false;
    if (!authenticated) return false;

    if (stateRef.current.plan === "visitor" && !persona) {
      persist({
        ...registerAsFree(stateRef.current),
        freeCredits: Math.max(1, stateRef.current.freeCredits),
        hasUsedProTrial: false,
      });
    }

    if (trialConsumingRef.current) return true;
    trialConsumingRef.current = true;
    try {
      // UI だけ解放。DB 消費は Pro API 成功時
      setProTrialActive(true);
      return true;
    } finally {
      trialConsumingRef.current = false;
    }
  }, [persist, proTrialActive, refreshFreeCredits, user]);

  const ensureProTrialOrPaid = useCallback(async () => {
    const persona = getDevPersona();
    const authenticated =
      Boolean(user) || persona === "free" || persona === "paid";
    const snap = getQuotaSnapshot(
      applyDevPersonaToState(stateRef.current, persona),
      { proTrialActive, isAuthenticated: authenticated },
    );
    if (snap.isPro) return true;
    if (snap.canUseProTrial || (authenticated && snap.freeCredits >= 1)) {
      return startProTrial();
    }
    return false;
  }, [proTrialActive, startProTrial, user]);

  const endProTrialSession = useCallback(() => {
    // 残枠は戻さない。セッション解放だけ終了してモザイク適用
    setProTrialActive(false);
    persist({
      ...stateRef.current,
      freeCredits: 0,
      hasUsedProTrial: true,
    });
  }, [persist]);

  const value = useMemo<BillingContextValue>(
    () => ({
      ready,
      state: effectiveState,
      quota,
      paywallOpen,
      openPaywall,
      closePaywall,
      pricingOpen,
      openPricing,
      closePricing,
      reserveGeneration,
      rollbackReservation,
      upgradePro: () => {
        persist(upgradeToPro(stateRef.current));
        setPaywallOpen(false);
        setProTrialActive(false);
        persistAnalyticsProfile({ plan_type: PROFILE_PLAN.paid, free_credits: 0 });
      },
      becomeFreeUser: () => {
        const current = stateRef.current;
        const freeCredits =
          current.hasUsedProTrial || current.freeCredits <= 0
            ? 0
            : Math.max(1, current.freeCredits);
        persist({
          ...registerAsFree(current),
          freeCredits,
          hasUsedProTrial: freeCredits <= 0,
        });
        setProTrialActive(false);
        // DB をローカル推測で 0 上書きしない（サーバー同期に任せる）
        if (freeCredits >= 1) {
          persistAnalyticsProfile({
            plan_type: PROFILE_PLAN.free,
            free_credits: freeCredits,
            has_used_pro_trial: false,
          });
        }
      },
      setPlanForDemo,
      devPersona,
      setDevPersona,
      setStripeCustomerId: (customerId) => {
        const nextId = customerId?.trim() || undefined;
        persist({
          ...stateRef.current,
          stripeCustomerId: nextId,
        });
      },
      trySaveTemplate: (name, payload) => {
        const result = saveTemplate(
          applyDevPersonaToState(stateRef.current, getDevPersona()),
          { name, payload },
        );
        if (!result.ok) return result;
        if (!getDevPersona()) {
          persist(result.state);
        }
        return { ok: true as const };
      },
      startProTrial,
      ensureProTrialOrPaid,
      endProTrialSession,
      refreshFreeCredits,
      applyRemainingCredits,
    }),
    [
      ready,
      effectiveState,
      quota,
      paywallOpen,
      pricingOpen,
      openPaywall,
      closePaywall,
      openPricing,
      closePricing,
      reserveGeneration,
      rollbackReservation,
      persist,
      setPlanForDemo,
      devPersona,
      setDevPersona,
      startProTrial,
      ensureProTrialOrPaid,
      endProTrialSession,
      refreshFreeCredits,
      applyRemainingCredits,
    ],
  );

  return (
    <BillingContext.Provider value={value}>{children}</BillingContext.Provider>
  );
}

export function useBilling(): BillingContextValue {
  const ctx = useContext(BillingContext);
  if (!ctx) {
    throw new Error("useBilling must be used within BillingProvider");
  }
  return ctx;
}
