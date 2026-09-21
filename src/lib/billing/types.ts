/** Billing / plan types for フリマリスト Sold */

export type PlanId = "visitor" | "free" | "premium" | "pro";

/** What was consumed for a successful generation */
export type ConsumeSource = "premium" | "free" | "ticket";

export type SavedTemplate = {
  id: string;
  name: string;
  createdAt: string;
  payload: Record<string, unknown>;
};

export type BillingState = {
  plan: PlanId;
  /** Extra generation credits purchased via tickets */
  ticketBalance: number;
  /** visitor trial uses (max 1) */
  visitorUsed: number;
  /** YYYY-MM of the free quota window */
  monthKey: string;
  /** Generations used from free monthly quota */
  freeUsedThisMonth: number;
  templates: SavedTemplate[];
  /** Stripe Customer ID (cus_...) for Customer Portal */
  stripeCustomerId?: string;
  /** Pro 1回お試しを消費済み（profiles.has_used_pro_trial と同期） */
  hasUsedProTrial: boolean;
};

export type ConsumeResult =
  | {
      ok: true;
      source: ConsumeSource;
      state: BillingState;
    }
  | {
      ok: false;
      reason: "limit_reached";
      state: BillingState;
    };

export type QuotaSnapshot = {
  plan: PlanId;
  /** premium or pro — unlimited single generation + templates */
  isPremium: boolean;
  /** Pro-only features (bulk + SEO insights dashboard) — 課金 or お試し中 */
  isPro: boolean;
  /** 課金 Pro（お試しロック解除を含まない） */
  isPaidPro: boolean;
  /** ログイン済み無料会員でまだお試し未使用 */
  canUseProTrial: boolean;
  /** お試し消費済み */
  hasUsedProTrial: boolean;
  /** 今回セッションでお試し解放中 */
  proTrialActive: boolean;
  /** Remaining free/trial generations (Infinity for premium/pro) */
  freeRemaining: number;
  freeLimit: number;
  ticketBalance: number;
  /** Human-readable indicator label */
  indicatorLabel: string;
  canGenerate: boolean;
  templateCount: number;
  templateLimit: number | null;
  canSaveTemplate: boolean;
};
