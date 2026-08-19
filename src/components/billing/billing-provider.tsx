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
  PRICING,
  createDefaultBillingState,
  getQuotaSnapshot,
  loadBillingState,
  purchaseTicketPack,
  registerAsFree,
  saveBillingState,
  saveTemplate,
  tryConsumeGeneration,
  upgradeToPremium,
  upgradeToPro,
  type BillingState,
  type ConsumeSource,
  type PlanId,
  type QuotaSnapshot,
} from "@/lib/billing";

type BillingContextValue = {
  ready: boolean;
  state: BillingState;
  quota: QuotaSnapshot;
  paywallOpen: boolean;
  openPaywall: () => void;
  closePaywall: () => void;
  /**
   * Reserve a generation slot before calling the API.
   * Returns false when blocked (paywall opened).
   */
  reserveGeneration: () =>
    | { ok: true; source: ConsumeSource }
    | { ok: false };
  /** Roll back a reserved slot if API generation failed */
  rollbackReservation: (source: ConsumeSource) => void;
  upgradePremium: () => void;
  upgradePro: () => void;
  buyTicketPack: () => void;
  becomeFreeUser: () => void;
  /** Demo helper: switch plan without payment */
  setPlanForDemo: (plan: PlanId) => void;
  /** Persist Stripe Customer ID for portal access */
  setStripeCustomerId: (customerId: string | null) => void;
  trySaveTemplate: (
    name: string,
    payload: Record<string, unknown>,
  ) => { ok: true } | { ok: false; reason: "template_limit" };
};

const BillingContext = createContext<BillingContextValue | null>(null);

export function BillingProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<BillingState>(() =>
    createDefaultBillingState("visitor"),
  );
  const [paywallOpen, setPaywallOpen] = useState(false);
  const stateRef = useRef(state);

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
    if (!ready) return;
    saveBillingState(state);
  }, [state, ready]);

  const quota = useMemo(() => getQuotaSnapshot(state), [state]);

  const persist = useCallback((next: BillingState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const reserveGeneration = useCallback(() => {
    const result = tryConsumeGeneration(stateRef.current);
    if (!result.ok) {
      setPaywallOpen(true);
      persist(result.state);
      return { ok: false as const };
    }
    persist(result.state);
    return { ok: true as const, source: result.source };
  }, [persist]);

  // 開発バイパス時は Paywall を自動で閉じる（スクショ用）
  useEffect(() => {
    if (!ready) return;
    if (quota.isPro && paywallOpen) {
      setPaywallOpen(false);
    }
  }, [ready, quota.isPro, paywallOpen]);

  const rollbackReservation = useCallback(
    (source: ConsumeSource) => {
      const prev = stateRef.current;
      if (source === "premium") return;
      if (source === "ticket") {
        persist({ ...prev, ticketBalance: prev.ticketBalance + 1 });
        return;
      }
      if (prev.plan === "visitor") {
        persist({
          ...prev,
          visitorUsed: Math.max(0, prev.visitorUsed - 1),
        });
        return;
      }
      if (prev.plan === "free") {
        persist({
          ...prev,
          freeUsedThisMonth: Math.max(0, prev.freeUsedThisMonth - 1),
        });
      }
    },
    [persist],
  );

  const value = useMemo<BillingContextValue>(
    () => ({
      ready,
      state,
      quota,
      paywallOpen,
      openPaywall: () => setPaywallOpen(true),
      closePaywall: () => setPaywallOpen(false),
      reserveGeneration,
      rollbackReservation,
      upgradePremium: () => {
        persist(upgradeToPremium(stateRef.current));
        setPaywallOpen(false);
      },
      upgradePro: () => {
        persist(upgradeToPro(stateRef.current));
        setPaywallOpen(false);
      },
      buyTicketPack: () => {
        persist(
          purchaseTicketPack(stateRef.current, PRICING.ticketPackCount),
        );
        setPaywallOpen(false);
      },
      becomeFreeUser: () => {
        persist(registerAsFree(stateRef.current));
      },
      setPlanForDemo: (plan) => {
        const current = stateRef.current;
        persist({
          ...createDefaultBillingState(plan),
          ticketBalance:
            plan === "premium" || plan === "pro" ? 0 : current.ticketBalance,
          stripeCustomerId: current.stripeCustomerId,
          templates:
            plan === "visitor"
              ? []
              : current.templates.slice(
                  0,
                  plan === "free" ? FREE_TEMPLATE_LIMIT : undefined,
                ),
        });
        setPaywallOpen(false);
      },
      setStripeCustomerId: (customerId) => {
        const next = customerId?.trim() || undefined;
        persist({
          ...stateRef.current,
          stripeCustomerId: next,
        });
      },
      trySaveTemplate: (name, payload) => {
        const result = saveTemplate(stateRef.current, { name, payload });
        if (!result.ok) return result;
        persist(result.state);
        return { ok: true as const };
      },
    }),
    [
      ready,
      state,
      quota,
      paywallOpen,
      reserveGeneration,
      rollbackReservation,
      persist,
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
