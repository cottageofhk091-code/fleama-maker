"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useBilling } from "@/components/billing/billing-provider";
import { BrandMark } from "@/components/brand-mark";
import { CenterModal } from "@/components/center-modal";
import { registerViaApi } from "@/lib/auth-api-client";
import { SITE_NAME } from "@/lib/site";

type Mode = "login" | "signup";

const primarySubmit =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60";

type HeaderAuthModalProps = {
  mode: Mode | null;
  onClose: () => void;
  onModeChange: (mode: Mode) => void;
};

/** ヘッダーのログイン / 新規登録モーダル（ボタン表示は Header 側） */
export function HeaderAuthModal({
  mode,
  onClose,
  onModeChange,
}: HeaderAuthModalProps) {
  const { signIn } = useAuth();
  const { becomeFreeUser } = useBilling();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const open = mode !== null;

  useEffect(() => {
    if (!open) {
      setEmail("");
      setPassword("");
      setBusy(false);
      setError(null);
      setInfo(null);
    }
  }, [open]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!mode) return;
    setBusy(true);
    setError(null);
    setInfo(null);

    if (mode === "login") {
      const result = await signIn(email.trim(), password);
      setBusy(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
      setEmail("");
      setPassword("");
      return;
    }

    // 新規登録: supabase.auth.signUp は使わず自前 API（Resend）のみ
    const result = await registerViaApi(email.trim(), password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    becomeFreeUser();
    setInfo(
      "確認メールを送信しました。メール内の「登録を完了する」リンクをクリックすると自動でログインし、トップページへ移動します。Pro機能は1回無料でお試しできます。",
    );
  }

  return (
    <CenterModal
      open={open}
      onClose={onClose}
      labelledBy="auth-dialog-title"
      closeDisabled={busy}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <BrandMark size={40} className="shrink-0 rounded-xl shadow-sm" />
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold tracking-wide text-teal-700 dark:text-teal-300">
                {SITE_NAME}
              </p>
              <h2
                id="auth-dialog-title"
                className="font-display text-lg font-bold text-slate-900 dark:text-white"
              >
                {mode === "login" ? "ログイン" : "新規登録"}
              </h2>
            </div>
          </div>
          <button
            type="button"
            aria-label="閉じる"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          メールアドレスとパスワードで
          {mode === "login" ? "ログイン" : "新規登録"}できます
        </p>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="auth-email"
              className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              メールアドレス
            </label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
          <div>
            <label
              htmlFor="auth-password"
              className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300"
            >
              パスワード（6文字以上）
            </label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          {mode === "login" && (
            <div className="text-right">
              <a
                href="/forgot-password"
                className="text-xs font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-300"
                onClick={onClose}
              >
                パスワードを忘れた方はこちら
              </a>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}
          {info && (
            <p className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs text-teal-800 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
              {info}
            </p>
          )}

          <button type="submit" disabled={busy} className={primarySubmit}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "login" ? "ログイン" : "新規登録する"}
          </button>
        </form>

        <button
          type="button"
          disabled={busy}
          onClick={() => {
            onModeChange(mode === "login" ? "signup" : "login");
            setError(null);
            setInfo(null);
          }}
          className="mt-4 w-full text-center text-xs text-slate-500 underline-offset-2 hover:underline dark:text-slate-400"
        >
          {mode === "login"
            ? "アカウントをお持ちでない方は新規登録"
            : "すでにアカウントがある方はログイン"}
        </button>
      </div>
    </CenterModal>
  );
}
