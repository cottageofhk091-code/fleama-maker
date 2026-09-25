"use client";

import { Loader2 } from "lucide-react";
import { CenterModal } from "@/components/center-modal";

type Props = {
  open: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Pro 1回無料お試しの使用確認ダイアログ
 */
export function ProTrialConfirmModal({
  open,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <CenterModal
      open={open}
      onClose={loading ? () => undefined : onCancel}
      labelledBy="pro-trial-confirm-title"
      closeDisabled={loading}
    >
      <div className="text-center">
        <p className="text-2xl" aria-hidden>
          🎁
        </p>
        <h2
          id="pro-trial-confirm-title"
          className="mt-2 font-display text-lg font-bold text-slate-900 dark:text-white"
        >
          Pro機能 1回無料お試しの確認
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          初回無料特典（残り1回）を使用して、制限なしで全機能を閲覧・出力しますか？
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            お試し枠を使用する
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-70 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            キャンセル
          </button>
        </div>
      </div>
    </CenterModal>
  );
}
