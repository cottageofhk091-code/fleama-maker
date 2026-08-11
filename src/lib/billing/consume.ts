import {
  FREE_MONTHLY_LIMIT,
  FREE_TEMPLATE_LIMIT,
  VISITOR_TRIAL_LIMIT,
  currentMonthKey,
  isUnlimitedPlan,
} from "./quotas";
import type {
  BillingState,
  ConsumeResult,
  QuotaSnapshot,
  SavedTemplate,
} from "./types";

export function createDefaultBillingState(
  plan: BillingState["plan"] = "visitor",
): BillingState {
  return {
    plan,
    ticketBalance: 0,
    visitorUsed: 0,
    monthKey: currentMonthKey(),
    freeUsedThisMonth: 0,
    templates: [],
  };
}

/** Roll monthly free quota when the calendar month changes */
export function syncBillingMonth(state: BillingState): BillingState {
  const monthKey = currentMonthKey();
  if (state.monthKey === monthKey) return state;
  return {
    ...state,
    monthKey,
    freeUsedThisMonth: 0,
  };
}

function freeLimitFor(plan: BillingState["plan"]): number {
  if (plan === "visitor") return VISITOR_TRIAL_LIMIT;
  if (plan === "free") return FREE_MONTHLY_LIMIT;
  return Number.POSITIVE_INFINITY;
}

function freeUsedFor(state: BillingState): number {
  if (state.plan === "visitor") return state.visitorUsed;
  if (state.plan === "free") return state.freeUsedThisMonth;
  return 0;
}

function freeRemainingFor(state: BillingState): number {
  if (isUnlimitedPlan(state.plan)) return Number.POSITIVE_INFINITY;
  return Math.max(0, freeLimitFor(state.plan) - freeUsedFor(state));
}

/**
 * Generation gate.
 * Priority: premium/pro (pass) → free quota → ticket → blocked.
 */
export function tryConsumeGeneration(raw: BillingState): ConsumeResult {
  const state = syncBillingMonth(raw);

  if (isUnlimitedPlan(state.plan)) {
    return { ok: true, source: "premium", state };
  }

  const freeRemaining = freeRemainingFor(state);
  if (freeRemaining > 0) {
    if (state.plan === "visitor") {
      return {
        ok: true,
        source: "free",
        state: { ...state, visitorUsed: state.visitorUsed + 1 },
      };
    }
    return {
      ok: true,
      source: "free",
      state: { ...state, freeUsedThisMonth: state.freeUsedThisMonth + 1 },
    };
  }

  if (state.ticketBalance > 0) {
    return {
      ok: true,
      source: "ticket",
      state: { ...state, ticketBalance: state.ticketBalance - 1 },
    };
  }

  return { ok: false, reason: "limit_reached", state };
}

export function getQuotaSnapshot(raw: BillingState): QuotaSnapshot {
  const state = syncBillingMonth(raw);
  const isPro = state.plan === "pro";
  const isPremium = isUnlimitedPlan(state.plan);
  const freeLimit = isPremium
    ? Number.POSITIVE_INFINITY
    : freeLimitFor(state.plan);
  const freeRemaining = freeRemainingFor(state);
  const ticketBalance = state.ticketBalance;
  const canGenerate = isPremium || freeRemaining > 0 || ticketBalance > 0;

  const templateLimit = isPremium
    ? null
    : state.plan === "free"
      ? FREE_TEMPLATE_LIMIT
      : 0;
  const templateCount = state.templates.length;
  const canSaveTemplate =
    isPremium ||
    (state.plan === "free" && templateCount < FREE_TEMPLATE_LIMIT);

  let indicatorLabel: string;
  if (isPro) {
    indicatorLabel = "Sold Pro：一括生成・SEO予測つき無制限";
  } else if (state.plan === "premium") {
    indicatorLabel = "Sold プレミアム：生成無制限";
  } else if (state.plan === "visitor") {
    indicatorLabel =
      freeRemaining > 0
        ? `お試し生成：あと${freeRemaining}回`
        : ticketBalance > 0
          ? `無料枠終了 / チケット残高：${ticketBalance}回`
          : "お試し枠を使い切りました";
  } else {
    if (freeRemaining > 0) {
      indicatorLabel = `今月の無料枠：あと${freeRemaining}回`;
    } else if (ticketBalance > 0) {
      indicatorLabel = `無料枠終了 / チケット残高：${ticketBalance}回`;
    } else {
      indicatorLabel = "今月の無料枠を使い切りました";
    }
  }

  return {
    plan: state.plan,
    isPremium,
    isPro,
    freeRemaining,
    freeLimit,
    ticketBalance,
    indicatorLabel,
    canGenerate,
    templateCount,
    templateLimit,
    canSaveTemplate,
  };
}

export function canSaveTemplate(state: BillingState): boolean {
  return getQuotaSnapshot(state).canSaveTemplate;
}

export function saveTemplate(
  state: BillingState,
  template: Omit<SavedTemplate, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  },
): { ok: true; state: BillingState } | { ok: false; reason: "template_limit" } {
  const synced = syncBillingMonth(state);
  if (!canSaveTemplate(synced)) {
    return { ok: false, reason: "template_limit" };
  }
  const entry: SavedTemplate = {
    id: template.id ?? crypto.randomUUID(),
    name: template.name,
    createdAt: template.createdAt ?? new Date().toISOString(),
    payload: template.payload,
  };
  return {
    ok: true,
    state: { ...synced, templates: [...synced.templates, entry] },
  };
}

/** Demo / checkout helpers (client-side simulation) */
export function upgradeToPremium(state: BillingState): BillingState {
  return { ...syncBillingMonth(state), plan: "premium" };
}

export function upgradeToPro(state: BillingState): BillingState {
  return { ...syncBillingMonth(state), plan: "pro" };
}

export function registerAsFree(state: BillingState): BillingState {
  const synced = syncBillingMonth(state);
  return {
    ...synced,
    plan: "free",
    freeUsedThisMonth: synced.freeUsedThisMonth,
  };
}

export function purchaseTicketPack(
  state: BillingState,
  count: number,
): BillingState {
  return {
    ...syncBillingMonth(state),
    ticketBalance: state.ticketBalance + count,
  };
}
