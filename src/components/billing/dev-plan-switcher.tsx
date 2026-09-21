"use client";

import { isDevPersonaEnabled, type DevPersona } from "@/lib/billing/dev-persona";
import { useBilling } from "@/components/billing/billing-provider";

const OPTIONS: { id: DevPersona; label: string }[] = [
  { id: "unauthenticated", label: "未登録 (未ログイン)" },
  { id: "free", label: "無料プラン" },
  { id: "paid", label: "Sold Pro (有料)" },
];

/**
 * development 限定: plan / 認証相当の動作確認スイッチ
 */
export function DevPlanSwitcher() {
  const { devPersona, setDevPersona, quota } = useBilling();

  if (!isDevPersonaEnabled()) return null;

  return (
    <div
      className="fixed bottom-3 right-3 z-[90] max-w-[min(100vw-1.5rem,22rem)] rounded-xl border border-amber-400/70 bg-amber-50/95 p-2.5 shadow-lg backdrop-blur-sm dark:border-amber-700 dark:bg-amber-950/90"
      role="group"
      aria-label="動作確認プラン切替"
    >
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200">
        動作確認 · plan={quota.plan} · isPro={String(quota.isPro)}
      </p>
      <div className="flex flex-wrap gap-1">
        {OPTIONS.map((opt) => {
          const active = devPersona === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDevPersona(opt.id);
              }}
              className={`rounded-lg px-2 py-1.5 text-[11px] font-semibold transition ${
                active
                  ? "bg-[#001F3F] text-[#D4AF37]"
                  : "bg-white text-slate-700 hover:bg-amber-100 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
