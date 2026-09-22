"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  establishSessionFromUrl,
  safeNextPath,
} from "@/lib/auth-session-from-url";
import { translateAuthError } from "@/lib/auth-errors";

/**
 * メール確認リンクの着地先。セッション確立後に next（既定: /）へ転送。
 */
export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await establishSessionFromUrl(searchParams);
      if (cancelled) return;
      if (!result.ok) {
        setError(translateAuthError(result.error));
        return;
      }
      const next = safeNextPath(searchParams.get("next"));
      router.replace(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-xl font-bold text-slate-900 dark:text-white">
          認証に失敗しました
        </h1>
        <p className="mt-3 text-sm text-red-600 dark:text-red-300">{error}</p>
        <a
          href="/"
          className="mt-6 inline-block text-sm font-medium text-teal-700 underline dark:text-teal-300"
        >
          トップへ戻る
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 py-16">
      <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      <p className="text-sm text-slate-600 dark:text-slate-300">
        ログイン処理中です…
      </p>
    </div>
  );
}
