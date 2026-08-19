/** Plan limits & pricing for フリマリスト Sold */

/** Free plan monthly generation cap (within 5–10 range) */
export const FREE_MONTHLY_LIMIT = 8;

/** Visitor (unregistered) trial generations */
export const VISITOR_TRIAL_LIMIT = 1;

/** Free plan max saved templates */
export const FREE_TEMPLATE_LIMIT = 2;

/** Pro bulk generation max items per run */
export const PRO_BULK_MAX_ITEMS = 10;

export const PRICING = {
  /** Sold プレミアム 月額（税込・円） */
  premiumMonthlyYen: 500,
  /** Sold Pro 月額（税込・円） */
  proMonthlyYen: 980,
  ticketPackCount: 10,
  ticketPackYen: 300,
} as const;

export const PLAN_LABELS = {
  visitor: "お試し（未登録）",
  free: "無料プラン",
  premium: "Sold プレミアム",
  pro: "Sold Pro",
} as const;

export function currentMonthKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function isUnlimitedPlan(plan: keyof typeof PLAN_LABELS): boolean {
  return plan === "premium" || plan === "pro";
}
