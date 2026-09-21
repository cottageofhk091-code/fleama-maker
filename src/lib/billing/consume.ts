import {
  FREE_MONTHLY_LIMIT,
  FREE_TEMPLATE_LIMIT,
  VISITOR_TRIAL_LIMIT,
  currentMonthKey,
  isUnlimitedPlan,
} from "./quotas";
import { isDevProBypassEnabled } from "./dev-bypass";
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
    hasUsedProTrial: false,
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

  // Local note/screenshot: Sold Pro 扱い（本番では isDevProBypassEnabled が常に false）
  if (isDevProBypassEnabled()) {
    return { ok: true, source: "premium", state };
  }

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

export function getQuotaSnapshot(
  raw: BillingState,
  options?: { proTrialActive?: boolean; isAuthenticated?: boolean },
): QuotaSnapshot {
  const state = syncBillingMonth(raw);
  const proTrialActive = Boolean(options?.proTrialActive);
  const isAuthenticated = Boolean(options?.isAuthenticated);

  if (isDevProBypassEnabled()) {
    return {
      plan: "pro",
      isPremium: true,
      isPro: true,
      isPaidPro: true,
      canUseProTrial: false,
      hasUsedProTrial: true,
      proTrialActive: false,
      freeRemaining: Number.POSITIVE_INFINITY,
      freeLimit: Number.POSITIVE_INFINITY,
      ticketBalance: state.ticketBalance,
      indicatorLabel: "Sold Pro：一括生成・SEO予測つき無制限",
      canGenerate: true,
      templateCount: state.templates.length,
      templateLimit: null,
      canSaveTemplate: true,
    };
  }

  const isPaidPro = isUnlimitedPlan(state.plan);
  const isPro = isPaidPro || proTrialActive;
  const isPremium = isPro;
  const hasUsedProTrial = Boolean(state.hasUsedProTrial);
  const canUseProTrial =
    isAuthenticated &&
    (state.plan === "free" || state.plan === "visitor") &&
    !isPaidPro &&
    !hasUsedProTrial &&
    !proTrialActive;

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
  if (isPaidPro) {
    indicatorLabel = "Sold Pro：一括生成・SEO予測つき無制限";
  } else if (proTrialActive) {
    indicatorLabel = "Proお試し中：今回限り解放";
  } else if (state.plan === "visitor") {
    indicatorLabel =
      freeRemaining > 0
        ? `お試し生成：あと${freeRemaining}回`
        : "お試し枠を使い切りました";
  } else {
    if (freeRemaining > 0) {
      indicatorLabel = `今月の無料枠：あと${freeRemaining}回`;
    } else {
      indicatorLabel = "今月の無料枠を使い切りました";
    }
  }

  return {
    plan: isPaidPro && state.plan === "premium" ? "pro" : state.plan,
    isPremium,
    isPro,
    isPaidPro,
    canUseProTrial,
    hasUsedProTrial,
    proTrialActive,
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
/** @deprecated プレミアム廃止 — Pro に統合 */
export function upgradeToPremium(state: BillingState): BillingState {
  return upgradeToPro(state);
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
    // 新規無料登録はお試し未使用として開始（サーバー同期で上書き可）
    hasUsedProTrial: synced.hasUsedProTrial,
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
