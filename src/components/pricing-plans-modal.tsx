"use client";

import { useCallback, useState } from "react";
import { Crown, Loader2, X } from "lucide-react";
import { CenterModal } from "@/components/center-modal";
import { useBilling } from "@/components/billing/billing-provider";
import { PRICING } from "@/lib/billing";
import { startCheckoutSession } from "@/lib/stripe-checkout-client";

const navLinkClass =
  "rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 transition hover:text-teal-700 dark:text-slate-300 dark:hover:text-teal-300";

type ModalProps = {
  open: boolean;
  onClose: () => void;
};

/** 制御可能な料金プランモーダル本体 */
export function PricingPlansModal({ open, onClose }: ModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    if (!loading) onClose();
  }, [loading, onClose]);

  async function handleUpgrade() {
    if (loading) return;
    setLoading(true);
    setError(null);
    const result = await startCheckoutSession("pro");
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    window.location.href = result.url;
  }

  return (
    <CenterModal
      open={open}
      onClose={close}
      labelledBy="pricing-dialog-title"
      closeDisabled={loading}
    >
      <div className="flex max-h-[85vh] flex-col">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
          <div>
            <h2
              id="pricing-dialog-title"
              className="font-display text-lg font-bold text-slate-900 dark:text-white"
            >
              無料と有料の違い
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              シンプルな2プラン構成です
            </p>
          </div>
          <button
            type="button"
            aria-label="閉じる"
            disabled={loading}
            onClick={close}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
          <section>
            <h3 className="text-sm font-bold text-teal-700 dark:text-teal-300">
              ■ 無料で出来ること（無料プラン）
            </h3>
            <ul className="mt-2 space-y-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
              <li>・単品生成（タイトル、商品説明文、ハッシュタグ生成）</li>
              <li>・コピー＆ペースト使い放題</li>
            </ul>
          </section>

          <section className="rounded-xl border border-[#D4AF37]/50 bg-[#001F3F] p-3.5 text-white sm:p-4">
            <h3 className="text-sm font-bold text-[#D4AF37]">
              ■ 有料で出来ること（Proプラン：月額
              {PRICING.proMonthlyYen.toLocaleString("ja-JP")}円）
            </h3>
            <ul className="mt-2 space-y-1 text-sm leading-relaxed text-slate-200">
              <li>・無料プランの全機能</li>
              <li>・SEOスコア表示</li>
              <li>・販促ブースト機能</li>
              <li>・10件一括生成</li>
            </ul>
          </section>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 px-5 py-4 dark:border-slate-800 sm:px-6">
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleUpgrade()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-3 text-sm font-bold text-[#001F3F] transition hover:bg-[#e0c15a] disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Crown className="h-4 w-4" />
            )}
            月額{PRICING.proMonthlyYen.toLocaleString("ja-JP")}
            円でProにアップグレード
          </button>
        </div>
      </div>
    </CenterModal>
  );
}

/** BillingProvider の pricingOpen に接続するホスト */
export function PricingPlansModalHost() {
  const { pricingOpen, closePricing } = useBilling();
  return (
    <PricingPlansModal open={pricingOpen} onClose={closePricing} />
  );
}

export function PricingPlansButton({ className = "" }: { className?: string }) {
  const { openPricing } = useBilling();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openPricing();
      }}
      className={`${navLinkClass} ${className}`}
    >
      料金プラン
    </button>
  );
}
