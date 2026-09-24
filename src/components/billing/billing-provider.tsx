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
  consumeProTrialRemote,
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
  /** Pro 1回お試しを開始（解放 + DB消費） */
  startProTrial: () => Promise<boolean>;
  /** 課金 Pro またはお試しで解放できれば true */
  ensureProTrialOrPaid: () => Promise<boolean>;
  /** お試しセッションを終了（次回からモザイク。残枠は戻さない） */
  endProTrialSession: () => void;
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
  const { user, ready: authReady } = useAuth();
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

      // DB を正とする（再ログインで「残り1回」に戻さない）
      const freeCredits =
        remote == null
          ? current.freeCredits
          : remote.freeCredits;
      const hasUsed =
        remote == null
          ? current.freeCredits <= 0 || current.hasUsedProTrial
          : remote.hasUsedProTrial;

      persist({
        ...current,
        plan: nextPlan === "premium" ? "pro" : nextPlan,
        freeCredits: hasUsed ? 0 : freeCredits,
        hasUsedProTrial: hasUsed,
      });

      if (current.plan === "visitor") {
        persistAnalyticsProfile({
          user_id: user.id,
          plan_type: PROFILE_PLAN.free,
          free_credits: hasUsed ? 0 : freeCredits,
          has_used_pro_trial: hasUsed,
        });
      }

      if (hasUsed) setProTrialActive(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [ready, authReady, user?.id, persist]);

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
      });
    }

    if (trialConsumingRef.current) return true;
    trialConsumingRef.current = true;
    try {
      // 先にローカルを 0 にして再実行時も即座にモザイク
      setProTrialActive(true);
      persist({
        ...stateRef.current,
        plan:
          stateRef.current.plan === "visitor" ? "free" : stateRef.current.plan,
        freeCredits: 0,
        hasUsedProTrial: true,
      });
      if (persona !== "free") {
        await consumeProTrialRemote(user?.id);
      }
      return true;
    } finally {
      trialConsumingRef.current = false;
    }
  }, [persist, proTrialActive, user]);

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
        // 新規登録直後: まだ DB 同期前なら 1 回付与。既に 0 なら維持
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
        persistAnalyticsProfile({
          plan_type: PROFILE_PLAN.free,
          free_credits: freeCredits,
          has_used_pro_trial: freeCredits <= 0,
        });
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
