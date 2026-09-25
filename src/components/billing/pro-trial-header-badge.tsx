"use client";

import { useBilling } from "@/components/billing/billing-provider";
import { useAuth } from "@/components/auth-provider";

/**
 * ヘッダー用：Pro無料お試しの残り回数バッジ
 */
export function ProTrialHeaderBadge() {
  const { ready: authReady, user } = useAuth();
  const { ready, quota } = useBilling();

  if (!authReady || !ready || !user) return null;
  if (quota.isPaidPro) return null;

  const remaining = Math.max(0, quota.freeCredits);
  const available = remaining >= 1 && !quota.hasUsedProTrial;

  if (available) {
    return (
      <span
        className="inline-flex max-w-[9.5rem] items-center truncate rounded-md border border-teal-200 bg-teal-50 px-1.5 py-1 text-[10px] font-semibold leading-tight text-teal-800 dark:border-teal-800 dark:bg-teal-950/80 dark:text-teal-200 sm:max-w-none sm:px-2 sm:text-[11px]"
        title={`Pro無料お試し：残り ${remaining} 回`}
      >
        <span className="sm:hidden">🎁 残り{remaining}回</span>
        <span className="hidden sm:inline">
          🎁 Pro無料お試し：残り {remaining} 回
        </span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex max-w-[9.5rem] items-center truncate rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 text-[10px] font-semibold leading-tight text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 sm:max-w-none sm:px-2 sm:text-[11px]"
      title="Pro無料枠：終了（有料プラン）"
    >
      <span className="sm:hidden">🔒 枠終了</span>
      <span className="hidden sm:inline">🔒 Pro無料枠：終了（有料プラン）</span>
    </span>
  );
}
