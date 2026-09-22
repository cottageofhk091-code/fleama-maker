"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { establishSessionFromUrl } from "@/lib/auth-session-from-url";
import { getSupabase } from "@/lib/supabase";
import { SITE_NAME } from "@/lib/site";

/**
 * 再設定メール着地後、URL の code / token_hash / #access_token から
 * リカバリーセッションが立つまで待ってからパスワード更新 UI を出す。
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isReady, setIsReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLinkError("Supabase が未設定です。");
      setIsReady(true);
      return;
    }

    let settled = false;
    let cancelled = false;
    let waitTimer: number | undefined;

    const markReady = () => {
      if (settled || cancelled) return;
      settled = true;
      setIsReady(true);
    };
    const markError = (message: string) => {
      if (settled || cancelled) return;
      settled = true;
      setLinkError(message);
      setIsReady(true);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" || session) {
          markReady();
        }
      },
    );

    // ?code= / ?token_hash= およびハッシュ処理済みセッション
    void (async () => {
      const result = await establishSessionFromUrl(searchParams);
      if (settled || cancelled) return;
      if (!result.ok) {
        markError(result.error);
        return;
      }
      if (result.type === "session") {
        markReady();
        return;
      }

      // Admin generateLink は #access_token&type=recovery で戻ることが多い
      const hash = window.location.hash.replace(/^#/, "");
      if (hash) {
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          const { error: setErr } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (settled || cancelled) return;
          if (setErr) {
            markError(setErr.message);
            return;
          }
          window.history.replaceState(
            null,
            "",
            `${window.location.pathname}${window.location.search}`,
          );
          markReady();
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (settled || cancelled) return;
      if (data.session) {
        markReady();
        return;
      }

      // detectSessionInUrl の非同期処理待ち（onAuthStateChange で先に解決する場合あり）
      waitTimer = window.setTimeout(() => {
        if (settled || cancelled) return;
        void supabase.auth.getSession().then(({ data: late }) => {
          if (settled || cancelled) return;
          if (late.session) {
            markReady();
            return;
          }
          markError(
            "再設定リンクが無効か期限切れです。もう一度メール送信からお試しください。",
          );
        });
      }, 2500);
    })();

    return () => {
      cancelled = true;
      if (waitTimer !== undefined) window.clearTimeout(waitTimer);
      authListener.subscription.unsubscribe();
    };
  }, [searchParams]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("パスワードは6文字以上にしてください。");
      return;
    }
    if (password !== passwordConfirm) {
      setError("パスワードが一致しません。");
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase が未設定です。");
      return;
    }

    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
    window.setTimeout(() => router.replace("/"), 1500);
  }

  if (!isReady) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          再設定リンクを確認しています…
        </p>
      </div>
    );
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
            新しいパスワード
          </h1>
        </div>
      </div>

      {linkError ? (
        <div className="space-y-4">
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {linkError}
          </p>
          <Link
            href="/forgot-password"
            className="inline-block text-sm font-medium text-teal-700 underline dark:text-teal-300"
          >
            再設定メールを送り直す
          </Link>
        </div>
      ) : done ? (
        <p className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-4 text-sm text-teal-900 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-100">
          パスワードの変更が完了しました。トップへ移動します…
        </p>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            新しいパスワードを入力してください（6文字以上）。
          </p>
          <div>
            <label
              htmlFor="new-password"
              className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              新しいパスワード
            </label>
            <input
              id="new-password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <div>
            <label
              htmlFor="new-password-confirm"
              className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              新しいパスワード（確認）
            </label>
            <input
              id="new-password-confirm"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
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
            パスワードを更新する
          </button>
        </form>
      )}
    </div>
  );
}
