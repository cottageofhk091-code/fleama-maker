import { createDefaultBillingState, syncBillingMonth } from "./consume";
import type { BillingState, PlanId } from "./types";

const STORAGE_KEY = "fleama-list-sold-billing-v1";

function isPlanId(value: unknown): value is PlanId {
  return (
    value === "visitor" ||
    value === "free" ||
    value === "premium" ||
    value === "pro"
  );
}

export function loadBillingState(): BillingState {
  if (typeof window === "undefined") {
    return createDefaultBillingState("visitor");
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultBillingState("visitor");
    const parsed = JSON.parse(raw) as Partial<BillingState>;
    let plan: PlanId = isPlanId(parsed.plan) ? parsed.plan : "visitor";
    // 旧プレミアムは有料 Pro に統合
    if (plan === "premium") plan = "pro";
    const base = createDefaultBillingState(plan);
    return syncBillingMonth({
      ...base,
      ticketBalance:
        typeof parsed.ticketBalance === "number" ? parsed.ticketBalance : 0,
      visitorUsed: typeof parsed.visitorUsed === "number" ? parsed.visitorUsed : 0,
      monthKey:
        typeof parsed.monthKey === "string" ? parsed.monthKey : base.monthKey,
      freeUsedThisMonth:
        typeof parsed.freeUsedThisMonth === "number"
          ? parsed.freeUsedThisMonth
          : 0,
      templates: Array.isArray(parsed.templates) ? parsed.templates : [],
      stripeCustomerId:
        typeof parsed.stripeCustomerId === "string" &&
        parsed.stripeCustomerId.trim()
          ? parsed.stripeCustomerId.trim()
          : undefined,
      hasUsedProTrial: Boolean(parsed.hasUsedProTrial),
    });
  } catch {
    return createDefaultBillingState("visitor");
  }
}

export function saveBillingState(state: BillingState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
