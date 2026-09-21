"use client";

import { Briefcase } from "lucide-react";
import { PLAN_LABELS } from "@/lib/billing";
import { useBilling } from "./billing-provider";

export function QuotaIndicator() {
  const { ready, quota, openPaywall } = useBilling();

  if (!ready) {
    return (
      <div className="h-10 animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800/70" />
    );
  }

  const planKey = quota.plan === "premium" ? "pro" : quota.plan;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wide text-teal-700 dark:text-teal-300">
            {PLAN_LABELS[planKey]}
          </p>
          <p className="mt-1 text-sm font-medium text-slate-800 dark:text-slate-100">
            {quota.indicatorLabel}
          </p>
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
        </div>
        {!quota.isPro && (
          <button
            type="button"
            onClick={openPaywall}
            className="inline-flex items-center justify-center rounded-xl bg-[#001F3F] px-3.5 py-2 text-xs font-bold text-[#D4AF37] transition hover:bg-[#00305f]"
          >
            Proへアップグレード
          </button>
        )}
      </div>
    </div>
  );
}
