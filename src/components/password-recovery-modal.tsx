"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { CenterModal } from "@/components/center-modal";
import { translateAuthError } from "@/lib/auth-errors";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PasswordRecoveryModal({ open, onClose }: Props) {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください。");
      return;
    }
    if (password !== confirm) {
      setError("パスワードが一致しません。");
      return;
    }
    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);
    if (!result.ok) {
      setError(translateAuthError(result.error));
      return;
    }
    setDone(true);
    window.setTimeout(() => {
      onClose();
      setPassword("");
      setConfirm("");
      setDone(false);
    }, 1200);
  }

  return (
    <CenterModal
      open={open}
      onClose={onClose}
      labelledBy="password-recovery-title"
      closeDisabled={busy}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <h2
            id="password-recovery-title"
            className="font-display text-lg font-bold text-slate-900 dark:text-white"
          >
            新しいパスワードの設定
          </h2>
          <button
            type="button"
            aria-label="閉じる"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <p className="mt-4 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
            パスワードの変更が完了しました。
          </p>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              新しいパスワードを入力してください（6文字以上）。
            </p>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="新しいパスワード"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="新しいパスワード（確認）"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              パスワードを更新する
            </button>
          </form>
        )}
      </div>
    </CenterModal>
  );
}
