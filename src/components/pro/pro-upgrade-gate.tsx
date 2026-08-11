"use client";

import { Briefcase, Crown } from "lucide-react";
import { PRICING } from "@/lib/billing";
import { useBilling } from "@/components/billing/billing-provider";

export function ProUpgradeGate() {
  const { upgradePro, upgradePremium, quota } = useBilling();

  return (
    <div className="rounded-2xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#001F3F] to-[#00305f] p-6 text-white shadow-sm sm:p-8">
      <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#D4AF37]">
        <Briefcase className="h-3.5 w-3.5" />
        Sold Pro 限定
      </div>
      <h2 className="mt-4 font-display text-2xl font-bold tracking-tight">
        一括生成 & SEO売却予測ダッシュボード
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
        最大10件を3大必須入力で並列生成。購買心理を最大化した説明文とSEO売却予測で、プロ出品者の回転率を上げます。
      </p>
      <ul className="mt-4 space-y-1.5 text-sm text-slate-200">
        <li>・最大10件の一括生成（進捗バー付き）</li>
        <li>・SEOスコア（0〜100）と予想売却期間</li>
        <li>・価格調整アドバイス / ワンクリック全件コピー</li>
      </ul>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={upgradePro}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#001F3F] transition hover:bg-[#e0c15a]"
        >
          <Crown className="h-4 w-4" />
          Proプランにアップグレード（月額{" "}
          {PRICING.proMonthlyYen.toLocaleString("ja-JP")}円）
        </button>
        {quota.plan !== "premium" && (
          <button
            type="button"
            onClick={upgradePremium}
            className="inline-flex items-center justify-center rounded-xl border border-white/25 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            まずはプレミアム（月額 {PRICING.premiumMonthlyYen.toLocaleString("ja-JP")}円）
          </button>
        )}
      </div>
      <p className="mt-3 text-xs text-slate-400">
        現在のプラン: {quota.plan} — Pro未満のため機能はロックされています
      </p>
    </div>
  );
}
