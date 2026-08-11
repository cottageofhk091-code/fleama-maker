"use client";

import { Briefcase, Crown, Ticket } from "lucide-react";
import { PLAN_LABELS } from "@/lib/billing";
import { useBilling } from "./billing-provider";

export function QuotaIndicator() {
  const { ready, quota, openPaywall, setPlanForDemo } = useBilling();

  if (!ready) {
    return (
      <div className="h-10 animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800/70" />
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-teal-700 dark:text-teal-300">
            {PLAN_LABELS[quota.plan]}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">
            {quota.indicatorLabel}
          </p>
          {!quota.isPremium &&
            quota.ticketBalance > 0 &&
            quota.freeRemaining > 0 && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                チケット残高：{quota.ticketBalance}回（無料枠消化後に自動消費）
              </p>
            )}
          {quota.plan === "free" && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              テンプレート保存：{quota.templateCount}/
              {quota.templateLimit ?? "∞"}
            </p>
          )}
          {quota.isPro && (
            <p className="mt-1 flex items-center gap-1 text-xs text-[#D4AF37]">
              <Briefcase className="h-3.5 w-3.5" />
              一括生成・SEOスコア・売却スピード予測が利用可能
            </p>
          )}
          {quota.plan === "premium" && (
            <p className="mt-1 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
              <Crown className="h-3.5 w-3.5" />
              トレンドSEO自動適用・テンプレート無限
            </p>
          )}
        </div>
        {!quota.isPro && (
          <button
            type="button"
            onClick={openPaywall}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/50"
          >
            <Ticket className="h-3.5 w-3.5" />
            プラン・チケット
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
        <span className="mr-1 self-center text-[10px] text-slate-400">
          動作確認:
        </span>
        {(["visitor", "free", "premium", "pro"] as const).map((plan) => (
          <button
            key={plan}
            type="button"
            onClick={() => setPlanForDemo(plan)}
            className={`rounded-md px-2 py-1 text-[10px] font-medium transition ${
              quota.plan === plan
                ? "bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            }`}
          >
            {PLAN_LABELS[plan]}
          </button>
        ))}
      </div>
    </div>
  );
}
