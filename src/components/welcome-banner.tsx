"use client";

import { X } from "lucide-react";

type Props = {
  message: string;
  onDismiss: () => void;
};

export function WelcomeBanner({ message, onDismiss }: Props) {
  if (!message) return null;
  return (
    <div className="border-b border-teal-200 bg-teal-50 px-4 py-3 dark:border-teal-900 dark:bg-teal-950/50">
      <div className="mx-auto flex max-w-5xl items-start gap-3">
        <p className="flex-1 text-sm font-medium text-teal-900 dark:text-teal-100">
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
