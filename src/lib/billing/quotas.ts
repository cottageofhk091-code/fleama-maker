/** Plan limits & pricing for フリマリスト Sold */

/** Free plan monthly generation cap */
export const FREE_MONTHLY_LIMIT = 8;

/** Visitor (unregistered) trial generations */
export const VISITOR_TRIAL_LIMIT = 1;

/** Free plan max saved templates */
export const FREE_TEMPLATE_LIMIT = 2;

/** Pro bulk generation max items per run */
export const PRO_BULK_MAX_ITEMS = 10;

export const PRICING = {
  /** Sold Pro（有料）月額（税込・円） */
  proMonthlyYen: 500,
} as const;

/** Analytics / profiles 用のプラン種別 */
export const PROFILE_PLAN = {
  free: "free",
  paid: "paid",
} as const;

export const PLAN_LABELS = {
  visitor: "お試し（未登録）",
  free: "無料プラン",
  /** @deprecated 旧プレミアム — Pro 扱いへ移行 */
  premium: "Sold Pro（移行済）",
  pro: "Sold Pro",
} as const;

export function currentMonthKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** 有料（Pro）のみ無制限。旧 premium も互換で無制限扱い */
export function isUnlimitedPlan(plan: keyof typeof PLAN_LABELS): boolean {
  return plan === "pro" || plan === "premium";
}

/** 表示・課金上の Pro（有料）判定 */
export function isPaidPlan(plan: keyof typeof PLAN_LABELS): boolean {
  return plan === "pro" || plan === "premium";
}
