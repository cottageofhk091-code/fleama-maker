"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { requestPasswordResetViaApi } from "@/lib/auth-api-client";
import { translateAuthError } from "@/lib/auth-errors";
import { markPendingRecovery } from "@/lib/auth-tab-sync";
import { SITE_NAME } from "@/lib/site";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    // supabase.auth.resetPasswordForEmail は使わない（Resend API 経由）
    const result = await requestPasswordResetViaApi(email.trim());
    setBusy(false);
    if (!result.ok) {
      setError(translateAuthError(result.error));
      return;
    }
    markPendingRecovery(email.trim());
    setSent(true);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-6 flex items-center gap-3">
        <BrandMark size={40} className="rounded-xl shadow-sm" />
        <div>
          <p className="text-[11px] font-semibold tracking-wide text-teal-700 dark:text-teal-300">
            {SITE_NAME}
          </p>
          <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-white">
            パスワード再設定
          </h1>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        登録済みのメールアドレスを入力してください。パスワード再設定用のリンクをお送りします。
      </p>

      {sent ? (
        <div className="mt-6 space-y-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-4 text-sm text-teal-900 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-100">
          <p>
            再設定メールを送信しました。メール内のリンクから新しいパスワードを設定してください。
          </p>
          <Link
            href="/"
            className="inline-block font-medium text-teal-700 underline dark:text-teal-300"
          >
            トップへ戻る
          </Link>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="forgot-email"
              className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              メールアドレス
            </label>
            <input
              id="forgot-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            リセットメールを送信
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <Link href="/" className="underline-offset-2 hover:underline">
          トップへ戻る
        </Link>
      </p>
    </div>
  );
}
