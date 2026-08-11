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
  /** Pro-only features (bulk + SEO insights dashboard) */
  isPro: boolean;
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
