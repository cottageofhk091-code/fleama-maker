"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Send, X } from "lucide-react";

const CANCEL_REASONS = [
  "料金が高い",
  "使う頻度が減った",
  "必要な機能が足りない",
  "一時的に利用を休止したい",
  "その他",
] as const;

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CancelSubscriptionModal({ open, onClose }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState<(typeof CANCEL_REASONS)[number]>(
    CANCEL_REASONS[0],
  );
  const [detail, setDetail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "cancel",
          name,
          email,
          subject: "解約・契約について",
          message: [
            "【SoldPro 解約申請】",
            `解約理由: ${reason}`,
            detail.trim() ? `詳細:\n${detail.trim()}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "送信に失敗しました");
      setStatus("success");
      setName("");
      setEmail("");
      setDetail("");
      setReason(CANCEL_REASONS[0]);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "送信に失敗しました");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
    >
      <button
        type="button"
        aria-label="背景をタップして閉じる"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="relative shrink-0 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <button
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
          <h2
            id="cancel-modal-title"
            className="pr-10 font-display text-lg font-bold text-slate-900 dark:text-white"
          >
            解約申請フォーム
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            解約理由をお聞かせください。確認後、契約停止の手続きを進めます。
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {status === "success" ? (
            <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-200">
              解約申請を受け付けました。内容を確認のうえ対応します。
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  お名前
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={fieldClass}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  メールアドレス
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={fieldClass}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  解約理由
                </label>
                <select
                  value={reason}
                  onChange={(e) =>
                    setReason(e.target.value as (typeof CANCEL_REASONS)[number])
                  }
                  className={fieldClass}
                >
                  {CANCEL_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                  詳細（任意）
                </label>
                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  className={`${fieldClass} min-h-[96px] resize-y`}
                  placeholder="差し支えなければ詳細をご記入ください"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
              )}
              <button
                type="submit"
                disabled={status === "loading"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-500 disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {status === "loading" ? "送信中…" : "解約を申請する"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
