"use client";

import { useState } from "react";
import { Check, Crown, Loader2, X } from "lucide-react";
import { PRICING } from "@/lib/billing";
import { startCheckoutSession } from "@/lib/stripe-checkout-client";

const ROWS = [
  {
    label: "出品文生成",
    free: "1日3回",
    freeOk: true,
    pro: "無制限",
    proOk: true,
  },
  {
    label: "SEOスコア予測",
    free: "なし",
    freeOk: false,
    pro: "あり",
    proOk: true,
  },
  {
    label: "一括生成",
    free: "なし",
    freeOk: false,
    pro: "あり",
    proOk: true,
  },
] as const;

const upgradeBtn =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-3.5 text-sm font-bold text-[#001F3F] shadow-sm transition hover:bg-[#e0c15a] disabled:cursor-not-allowed disabled:opacity-70";

function CellMark({ ok, text }: { ok: boolean; text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm font-medium">
      {ok ? (
        <Check className="h-4 w-4 shrink-0 text-teal-600" aria-hidden />
      ) : (
        <X className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
      )}
      <span className={ok ? "text-slate-800 dark:text-slate-100" : "text-slate-500"}>
        {text}
      </span>
    </span>
  );
}

/**
 * Free / Pro の違いを一目で伝える比較 UI（旧 ProUpgradeGate の代替）
 */
export function PlanCompare() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <section className="space-y-4">
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
          Free と Pro の違い
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          必要な機能だけ、シンプルに比較できます
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Free */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-6">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Free
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-slate-900 dark:text-white">
            無料
          </p>
          <ul className="mt-5 space-y-3 border-t border-slate-100 pt-5 dark:border-slate-800">
            {ROWS.map((row) => (
              <li key={row.label} className="flex items-start justify-between gap-3">
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  {row.label}
                </span>
                <CellMark ok={row.freeOk} text={row.free} />
              </li>
            ))}
          </ul>
        </div>

        {/* Pro — emphasized */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-[#D4AF37]/70 bg-gradient-to-br from-[#001F3F] to-[#003366] p-5 text-white shadow-lg sm:p-6">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#D4AF37]/15" />
          <div className="relative">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-[#D4AF37] uppercase">
              <Crown className="h-3.5 w-3.5" />
              Pro（おすすめ）
            </p>
            <p className="mt-1 font-display text-2xl font-bold">
              月額 {PRICING.proMonthlyYen.toLocaleString("ja-JP")}円
            </p>
            <ul className="mt-5 space-y-3 border-t border-white/15 pt-5">
              {ROWS.map((row) => (
                <li
                  key={row.label}
                  className="flex items-start justify-between gap-3"
                >
                  <span className="text-sm text-slate-200">{row.label}</span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#D4AF37]">
                    {row.proOk ? (
                      <Check className="h-4 w-4 shrink-0" aria-hidden />
                    ) : (
                      <X className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
                    )}
                    {row.pro}
                  </span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              disabled={loading}
              onClick={() => void handleUpgrade()}
              className={`mt-6 ${upgradeBtn}`}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Crown className="h-4 w-4" />
              )}
              月額{PRICING.proMonthlyYen.toLocaleString("ja-JP")}円でProにアップグレード
            </button>
            {error && (
              <p className="mt-3 text-xs text-amber-200/90">{error}</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
