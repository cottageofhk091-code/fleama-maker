"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type Props = {
  message: string;
  onDismiss: () => void;
  /** 自動で閉じるまでのミリ秒（0 で無効） */
  autoDismissMs?: number;
};

/**
 * モーダル（z-50）より前面に出す固定バナー
 */
export function WelcomeBanner({
  message,
  onDismiss,
  autoDismissMs = 12000,
}: Props) {
  useEffect(() => {
    if (!message || autoDismissMs <= 0) return;
    const timer = window.setTimeout(onDismiss, autoDismissMs);
    return () => window.clearTimeout(timer);
  }, [message, autoDismissMs, onDismiss]);

  if (!message) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[100] border-b border-teal-300 bg-teal-50 px-4 py-3 shadow-md dark:border-teal-800 dark:bg-teal-950"
    >
      <div className="mx-auto flex max-w-5xl items-start gap-3 pt-[env(safe-area-inset-top)]">
        <p className="flex-1 text-sm font-semibold text-teal-950 dark:text-teal-50">
          {message}
        </p>
        <button
          type="button"
          aria-label="閉じる"
          onClick={onDismiss}
          className="rounded-lg p-1 text-teal-800/70 hover:bg-teal-100 dark:text-teal-100 dark:hover:bg-teal-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
