import {
  FREE_TEMPLATE_LIMIT,
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
    freeCredits: 1,
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

/**
 * Generation gate.
 * 基本生成は無制限（Pro 機能とは別）。常に許可。
 */
export function tryConsumeGeneration(raw: BillingState): ConsumeResult {
  const state = syncBillingMonth(raw);

  if (isDevProBypassEnabled() || isUnlimitedPlan(state.plan)) {
    return { ok: true, source: "premium", state };
  }

  return { ok: true, source: "free", state };
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
      freeCredits: 0,
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
  const freeCredits = Math.max(0, Math.floor(state.freeCredits ?? 0));
  // free_credits を正とする（残0なら必ず消費済み）
  const hasUsedProTrial = freeCredits <= 0;
  const canUseProTrial =
    isAuthenticated &&
    (state.plan === "free" || state.plan === "visitor") &&
    !isPaidPro &&
    freeCredits >= 1;
  // 残り枠がある間は Pro 制限をスルー（成功時に API が消費）
  const isPro = isPaidPro || proTrialActive || canUseProTrial;
  const isPremium = isPro;

  const freeLimit = Number.POSITIVE_INFINITY;
  const freeRemaining = Number.POSITIVE_INFINITY;
  const ticketBalance = state.ticketBalance;
  // 基本生成は常に無料・無制限
  const canGenerate = true;

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
  } else if (proTrialActive || canUseProTrial) {
    indicatorLabel = `標準生成：無料無制限 · Proお試し残り${Math.max(1, freeCredits)}回`;
  } else if (hasUsedProTrial) {
    indicatorLabel = "標準生成：無料無制限 · Proお試し済み";
  } else {
    indicatorLabel = "標準生成：無料無制限";
  }

  return {
    plan: isPaidPro && state.plan === "premium" ? "pro" : state.plan,
    isPremium,
    isPro,
    isPaidPro,
    canUseProTrial,
    hasUsedProTrial,
    freeCredits: hasUsedProTrial ? 0 : freeCredits,
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
    // DB 同期前は既存の残枠を維持（消費済みを「残り1」に戻さない）
    freeCredits: synced.freeCredits,
    hasUsedProTrial: synced.freeCredits <= 0 || synced.hasUsedProTrial,
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
