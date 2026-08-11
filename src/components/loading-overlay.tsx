"use client";

import { Loader2 } from "lucide-react";

export function LoadingOverlay({ message = "出品文を生成中…" }: { message?: string }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm"
      role="status"
      aria-live="polite"
    >
      <div className="mx-4 flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white px-8 py-10 shadow-xl dark:border-slate-700 dark:bg-slate-900">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-teal-400/30" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
        </div>
        <div className="text-center">
          <p className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            {message}
          </p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            修正不要の完成文に仕上げています
          </p>
        </div>
        <div className="flex w-full gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-1.5 flex-1 animate-pulse rounded-full bg-teal-500"
              style={{ animationDelay: `${i * 180}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
