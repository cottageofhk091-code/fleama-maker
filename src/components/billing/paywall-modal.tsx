"use client";

import { useEffect, useState } from "react";
import { Briefcase, Crown, Loader2, Ticket, X, Zap } from "lucide-react";
import { FREE_MONTHLY_LIMIT, PRICING } from "@/lib/billing";
import {
  startCheckoutSession,
  type CheckoutPlanType,
} from "@/lib/stripe-checkout-client";
import { useBilling } from "./billing-provider";

export function PaywallModal() {
  const { paywallOpen, closePaywall, becomeFreeUser, quota, state } =
    useBilling();
  const [loadingPlan, setLoadingPlan] = useState<CheckoutPlanType | "free" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paywallOpen) return;
    setError(null);
    setLoadingPlan(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loadingPlan) closePaywall();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paywallOpen, closePaywall, loadingPlan]);

  if (!paywallOpen) return null;

  const busy = loadingPlan != null;

  async function handleCheckout(planType: CheckoutPlanType) {
    if (busy) return;
    setError(null);
    setLoadingPlan(planType);
    const result = await startCheckoutSession(planType);
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
    // 無料枠（月8回）は becomeFreeUser で有効化済み。トップへ戻して続行しやすくする
    if (typeof window !== "undefined" && window.location.pathname !== "/") {
      window.location.href = "/";
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) closePaywall();
      }}
    >
      <div className="animate-in-fade w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
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
              ? "お試し生成は終了です。無料登録・プレミアム・Proから選べます。"
              : "今月の無料枠を使い切りました。プランアップかチケットで追加生成できます。"}
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={() => handleCheckout("pro")}
            className="flex w-full flex-col gap-1 rounded-xl bg-[#001F3F] px-4 py-3.5 text-left text-white transition hover:bg-[#00305f] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold">
              {loadingPlan === "pro" ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#D4AF37]" />
              ) : (
                <Briefcase className="h-4 w-4 text-[#D4AF37]" />
              )}
              {loadingPlan === "pro"
                ? "処理中..."
                : `Sold Pro（月額 ${PRICING.proMonthlyYen.toLocaleString("ja-JP")}円）`}
            </span>
            <span className="text-xs text-slate-300">
              一括生成・SEOスコア・売却スピード予測・無制限生成
            </span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => handleCheckout("premium")}
            className="flex w-full flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-left transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              {loadingPlan === "premium" ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#D4AF37]" />
              ) : (
                <Crown className="h-4 w-4 text-[#D4AF37]" />
              )}
              {loadingPlan === "premium"
                ? "処理中..."
                : `Sold プレミアム（月額 ${PRICING.premiumMonthlyYen.toLocaleString("ja-JP")}円）`}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              生成無制限・トレンドSEO自動適用・テンプレート無限保存
            </span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => handleCheckout("ticket_10")}
            className="flex w-full flex-col gap-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-left transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-amber-800 dark:bg-amber-950/40 dark:hover:bg-amber-900/40"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-amber-950 dark:text-amber-100">
              {loadingPlan === "ticket_10" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Ticket className="h-4 w-4" />
              )}
              {loadingPlan === "ticket_10"
                ? "処理中..."
                : `${PRICING.ticketPackCount}回分チケット（${PRICING.ticketPackYen.toLocaleString("ja-JP")}円）`}
            </span>
            <span className="text-xs text-amber-800/80 dark:text-amber-200/80">
              無料枠消化後に自動消費（現在残高: {state.ticketBalance}回）
            </span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={handleContinueFree}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {loadingPlan === "free" ? (
              <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
            ) : (
              <Zap className="h-4 w-4 text-teal-600" />
            )}
            {loadingPlan === "free"
              ? "処理中..."
              : `まずは無料プランで続ける（月${FREE_MONTHLY_LIMIT}回まで）`}
          </button>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
