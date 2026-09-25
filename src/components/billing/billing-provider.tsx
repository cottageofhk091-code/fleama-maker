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
import { authJsonHeaders } from "@/lib/auth-fetch";
import { useAuth } from "@/components/auth-provider";
import { ProTrialConfirmModal } from "@/components/billing/pro-trial-confirm-modal";

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
  /** Pro 1回お試し（確認モーダル→消費→即時ロック解除） */
  startProTrial: () => Promise<boolean>;
  /** 課金 Pro またはお試しで解放できれば true */
  ensureProTrialOrPaid: () => Promise<boolean>;
  /** お試しセッションを終了（次回からモザイク。残枠は戻さない） */
  endProTrialSession: () => void;
  /**
   * 生成リセット用: Pro ロック（モザイク）だけ戻す。
   * free_credits / 消費済みフラグは変更しない。
   */
  lockProSession: () => void;
  /** DB の free_credits を再取得して反映 */
  refreshFreeCredits: () => Promise<void>;
  /** Pro API レスポンスの remainingCredits を即時反映 */
  applyRemainingCredits: (remainingCredits: number) => void;
  /** お試し消費後の Pro API 用トークン */
  trialToken: string | null;
  /**
   * ログインユーザーの free_credits がサーバー同期済みか。
   * false の間はヘッダーで仮の「残り1回」を出さない。
   */
  creditsReady: boolean;
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
  const [trialToken, setTrialToken] = useState<string | null>(null);
  const [trialConfirmOpen, setTrialConfirmOpen] = useState(false);
  const [trialConfirmLoading, setTrialConfirmLoading] = useState(false);
  const [creditsReady, setCreditsReady] = useState(false);
  const stateRef = useRef(state);
  const trialConsumingRef = useRef(false);
  const welcomeWasOpenRef = useRef(false);
  const trialConfirmResolverRef = useRef<((ok: boolean) => void) | null>(null);

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
    if (!remote) {
      setCreditsReady(true);
      return;
    }

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
    setCreditsReady(true);
  }, [persist, user?.id]);

  const applyRemainingCredits = useCallback(
    (remainingCredits: number) => {
      const credits = Math.max(0, Math.floor(remainingCredits));
      persist({
        ...stateRef.current,
        freeCredits: credits,
        hasUsedProTrial: credits <= 0 || stateRef.current.hasUsedProTrial,
      });
      // 確認解除済みセッションは残0でもロックを維持
    },
    [persist],
  );

  // ログイン済みなら visitor → free へ昇格し、free_credits をサーバー同期
  useEffect(() => {
    if (!ready || !authReady) return;
    if (!user?.id) {
      setProTrialActive(false);
      setCreditsReady(true);
      return;
    }

    setCreditsReady(false);
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
        // 取得失敗時は「残り1」を捏造しない。ローカルの消費済みを優先
        persist({
          ...current,
          plan: nextPlan === "premium" ? "pro" : nextPlan,
          freeCredits:
            current.hasUsedProTrial || current.freeCredits <= 0
              ? 0
              : current.freeCredits,
          hasUsedProTrial:
            current.hasUsedProTrial || current.freeCredits <= 0,
        });
        setCreditsReady(true);
        return;
      }

      persist({
        ...current,
        plan: nextPlan === "premium" ? "pro" : nextPlan,
        freeCredits: remote.freeCredits,
        hasUsedProTrial: remote.hasUsedProTrial,
      });
      setCreditsReady(true);
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

  const consumeAndUnlockTrial = useCallback(async (): Promise<boolean> => {
    const persona = getDevPersona();
    if (persona === "free") {
      setProTrialActive(true);
      persist({
        ...stateRef.current,
        plan: "free",
        freeCredits: 0,
        hasUsedProTrial: true,
      });
      return true;
    }

    if (trialConsumingRef.current) return proTrialActive;
    trialConsumingRef.current = true;
    try {
      const headers = await authJsonHeaders();
      if (!("Authorization" in headers) && !persona) {
        return false;
      }
      const res = await fetch("/api/me/free-credits", {
        method: "POST",
        headers,
      });
      const data = (await res.json()) as {
        success?: boolean;
        remainingCredits?: number;
        trialToken?: string;
        error?: string;
      };
      if (!res.ok || !data.success) {
        return false;
      }

      if (typeof data.trialToken === "string" && data.trialToken) {
        setTrialToken(data.trialToken);
      }

      // 消費とロック解除を同時反映（ヘッダー残0 + モザイク解除）
      setProTrialActive(true);
      persist({
        ...stateRef.current,
        plan:
          stateRef.current.plan === "visitor" ? "free" : stateRef.current.plan,
        freeCredits: 0,
        hasUsedProTrial: true,
      });
      setCreditsReady(true);
      return true;
    } catch (error) {
      console.error("Pro trial consume failed:", error);
      return false;
    } finally {
      trialConsumingRef.current = false;
    }
  }, [persist, proTrialActive]);

  const startProTrial = useCallback(async () => {
    const persona = getDevPersona();
    const authenticated =
      Boolean(user) || persona === "free" || persona === "paid";

    if (user?.id && persona !== "free") {
      await refreshFreeCredits();
    }

    const snap = getQuotaSnapshot(
      applyDevPersonaToState(stateRef.current, persona),
      { proTrialActive, isAuthenticated: authenticated },
    );

    if (snap.isPaidPro) return true;
    if (proTrialActive) return true;
    if (!authenticated) return false;
    if (snap.freeCredits <= 0 || snap.hasUsedProTrial) return false;

    if (stateRef.current.plan === "visitor" && !persona) {
      persist({
        ...registerAsFree(stateRef.current),
        freeCredits: Math.max(1, stateRef.current.freeCredits),
        hasUsedProTrial: false,
      });
    }

    // 確認モーダルを表示し、ユーザー確定まで待つ
    return await new Promise<boolean>((resolve) => {
      trialConfirmResolverRef.current = resolve;
      setTrialConfirmOpen(true);
    });
  }, [persist, proTrialActive, refreshFreeCredits, user]);

  const handleTrialConfirm = useCallback(async () => {
    setTrialConfirmLoading(true);
    const ok = await consumeAndUnlockTrial();
    setTrialConfirmLoading(false);
    setTrialConfirmOpen(false);
    trialConfirmResolverRef.current?.(ok);
    trialConfirmResolverRef.current = null;
  }, [consumeAndUnlockTrial]);

  const handleTrialCancel = useCallback(() => {
    if (trialConfirmLoading) return;
    setTrialConfirmOpen(false);
    trialConfirmResolverRef.current?.(false);
    trialConfirmResolverRef.current = null;
  }, [trialConfirmLoading]);

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
    setProTrialActive(false);
    setTrialToken(null);
    persist({
      ...stateRef.current,
      freeCredits: 0,
      hasUsedProTrial: true,
    });
  }, [persist]);

  /** リセット時: ロックのみ戻し、クレジット残数は維持 */
  const lockProSession = useCallback(() => {
    setProTrialActive(false);
    setTrialToken(null);
  }, []);

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
        setTrialToken(null);
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
        setTrialToken(null);
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
      lockProSession,
      refreshFreeCredits,
      applyRemainingCredits,
      trialToken,
      creditsReady,
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
      lockProSession,
      refreshFreeCredits,
      applyRemainingCredits,
      trialToken,
      creditsReady,
    ],
  );

  return (
    <BillingContext.Provider value={value}>
      {children}
      <ProTrialConfirmModal
        open={trialConfirmOpen}
        loading={trialConfirmLoading}
        onConfirm={() => void handleTrialConfirm()}
        onCancel={handleTrialCancel}
      />
    </BillingContext.Provider>
  );
}

export function useBilling(): BillingContextValue {
  const ctx = useContext(BillingContext);
  if (!ctx) {
    throw new Error("useBilling must be used within BillingProvider");
  }
  return ctx;
}
