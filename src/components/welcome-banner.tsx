"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type Props = {
  message: string;
  onDismiss: () => void;
  /** 自動で閉じるまでのミリ秒（0 で無効） */
  autoDismissMs?: number;
};

export function WelcomeBanner({
  message,
  onDismiss,
  autoDismissMs = 10000,
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
      className="border-b border-teal-200 bg-teal-50 px-4 py-3 dark:border-teal-900 dark:bg-teal-950/50"
    >
      <div className="mx-auto flex max-w-5xl items-start gap-3">
        <p className="flex-1 text-sm font-semibold text-teal-900 dark:text-teal-100">
          {message}
        </p>
        <button
          type="button"
          aria-label="閉じる"
          onClick={onDismiss}
          className="rounded-lg p-1 text-teal-700/70 hover:bg-teal-100 dark:text-teal-200 dark:hover:bg-teal-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
