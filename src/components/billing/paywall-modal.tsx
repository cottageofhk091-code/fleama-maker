"use client";

import { useState } from "react";
import { Crown, Loader2, X, Zap } from "lucide-react";
import { CenterModal } from "@/components/center-modal";
import { FREE_MONTHLY_LIMIT, PRICING } from "@/lib/billing";
import { startCheckoutSession } from "@/lib/stripe-checkout-client";
import { useBilling } from "./billing-provider";

export function PaywallModal() {
  const { paywallOpen, closePaywall, becomeFreeUser, quota } = useBilling();
  const [loadingPlan, setLoadingPlan] = useState<"pro" | "free" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = loadingPlan != null;

  async function handleCheckoutPro() {
    if (busy) return;
    setError(null);
    setLoadingPlan("pro");
    const result = await startCheckoutSession("pro");
    if (!result.ok) {
      setError(result.error);
      setLoadingPlan(null);
      return;
    }
    window.location.href = result.url;
  }

  function handleContinueFree() {
    if (busy) return;
    setLoadingPlan("free");
    becomeFreeUser();
    closePaywall();
    setLoadingPlan(null);
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.location.href = "/";
    }
  }

  return (
    <CenterModal
      open={paywallOpen}
      onClose={() => {
        if (!busy) closePaywall();
      }}
      labelledBy="paywall-title"
      closeDisabled={busy}
      padded={false}
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div>
          <p className="text-xs font-semibold tracking-wide text-teal-700 dark:text-teal-300">
            生成枠の上限に達しました
          </p>
          <h2
            id="paywall-title"
            className="mt-1 font-display text-lg font-bold text-slate-900 dark:text-white"
          >
            もっと売れる出品文を作り続けよう
          </h2>
        </div>
        <button
          type="button"
          aria-label="閉じる"
          disabled={busy}
          onClick={closePaywall}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 px-5 py-4">
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {quota.plan === "visitor"
            ? "お試し生成は終了です。無料プランか Sold Pro から選べます。"
            : "今月の無料枠を使い切りました。Sold Pro で無制限に生成できます。"}
        </p>

        <button
          type="button"
          disabled={busy}
          onClick={() => void handleCheckoutPro()}
          className="inline-flex w-full flex-col gap-1 rounded-xl bg-[#001F3F] px-4 py-3.5 text-left text-white transition hover:bg-[#00305f] disabled:cursor-not-allowed disabled:opacity-70"
        >
          <span className="inline-flex items-center gap-2 text-sm font-bold text-[#D4AF37]">
            {loadingPlan === "pro" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Crown className="h-4 w-4" />
            )}
            {loadingPlan === "pro" ? "処理中..." : "Proへアップグレード"}
          </span>
          <span className="text-xs text-slate-300">
            月額 {PRICING.proMonthlyYen.toLocaleString("ja-JP")}
            円・一括生成・SEO予測・無制限生成
          </span>
        </button>

        <button
          type="button"
          disabled={busy}
          onClick={handleContinueFree}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loadingPlan === "free" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {loadingPlan === "free"
            ? "処理中..."
            : `無料プランで続ける（月${FREE_MONTHLY_LIMIT}回）`}
        </button>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}
      </div>
    </CenterModal>
  );
}
