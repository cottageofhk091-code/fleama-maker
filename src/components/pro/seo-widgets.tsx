"use client";

import type { SeoInsights } from "@/lib/seo-insights";

export function SeoScoreGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const color =
    clamped >= 80
      ? "#0d9488"
      : clamped >= 60
        ? "#D4AF37"
        : clamped >= 40
          ? "#f59e0b"
          : "#ef4444";

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative h-14 w-14 shrink-0"
        role="img"
        aria-label={`SEOスコア ${clamped}点`}
      >
        <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            className="text-slate-200 dark:text-slate-700"
          />
          <circle
            cx="18"
            cy="18"
            r="15.5"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${(clamped / 100) * 97.4} 97.4`}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900 dark:text-white">
          {clamped}
        </span>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          SEOスコア
        </p>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {clamped >= 80 ? "優秀" : clamped >= 60 ? "良好" : clamped >= 40 ? "改善余地" : "要改善"}
        </p>
      </div>
    </div>
  );
}

export function SaleSpeedBadge({ speed }: { speed: SeoInsights["saleSpeed"] }) {
  const tone =
    speed === "24時間以内" || speed === "3日以内"
      ? "bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/50 dark:text-teal-200 dark:border-teal-800"
      : speed === "要価格見直し"
        ? "bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900"
        : "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}
    >
      予想売却: {speed}
    </span>
  );
}
