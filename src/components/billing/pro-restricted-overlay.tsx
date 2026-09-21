"use client";

import type { MouseEvent, ReactNode } from "react";
import { useState } from "react";
import { Crown, Gift, Loader2 } from "lucide-react";
import { PRICING } from "@/lib/billing";
import { startCheckoutSession } from "@/lib/stripe-checkout-client";
import { useBilling } from "@/components/billing/billing-provider";

type Props = {
  children: ReactNode;
  /** false のときそのまま表示（制限なし） */
  locked?: boolean;
  className?: string;
  minHeightClass?: string;
};

/**
 * 無料ユーザー向け Pro 機能のモザイク保護 + アップグレード / お試し誘導
 */
export function ProRestrictedOverlay({
  children,
  locked = true,
  className = "",
  minHeightClass = "min-h-[220px]",
}: Props) {
  const { openPricing, quota, startProTrial } = useBilling();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!locked) {
    return <div className={className}>{children}</div>;
  }

  const yen = PRICING.proMonthlyYen.toLocaleString("ja-JP");
  const offerTrial = quota.canUseProTrial;

  async function handleUpgrade(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    setError(null);
    const result = await startCheckoutSession("pro");
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      openPricing();
      return;
    }
    window.location.href = result.url;
  }

  async function handleTrial(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    setError(null);
    const ok = await startProTrial();
    setLoading(false);
    if (!ok) {
      setError("お試し権がありません。Proプランをご検討ください。");
      openPricing();
    }
  }

  return (
    <div
      className={`pro-restricted-container relative overflow-hidden rounded-[inherit] ${minHeightClass} ${className}`}
    >
      <div className="pro-restricted-content" aria-hidden>
        {children}
      </div>
      <div
        className="pro-overlay-card"
        role="dialog"
        aria-label="Proプラン限定機能"
      >
        <div className="flex max-h-full w-full max-w-[16rem] flex-col items-center overflow-hidden">
          <div className="mb-1 flex flex-wrap items-center justify-center gap-1.5 text-base font-bold text-slate-800 dark:text-slate-100">
            <span aria-hidden>{offerTrial ? "🎁" : "🔒"}</span>
            <span>
              {offerTrial ? "初回限定特典" : "Proプラン限定機能"}
            </span>
            {!offerTrial && (
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                （月額{yen}円）
              </span>
            )}
          </div>
          <p className="mb-3 text-xs text-slate-600 dark:text-slate-300">
            SEOスコア分析 / 販促ブースト / 10件一括生成
          </p>
          {offerTrial ? (
            <button
              type="button"
              disabled={loading}
              onClick={(e) => void handleTrial(e)}
              className="mb-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-teal-500 disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Gift className="h-3.5 w-3.5" />
              )}
              初回限定特典！Pro機能を1回無料で試す
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={(e) => void handleUpgrade(e)}
              className="mb-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-5 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-amber-600 disabled:opacity-70"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Crown className="h-3.5 w-3.5" />
              )}
              月額{yen}円でProにアップグレード
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openPricing();
            }}
            className="text-xs text-teal-600 underline hover:text-teal-700 dark:text-teal-300 dark:hover:text-teal-200"
          >
            プランの詳細を見る
          </button>
          {error && (
            <p className="mt-1.5 max-w-full truncate text-[10px] text-red-600 dark:text-red-300">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
