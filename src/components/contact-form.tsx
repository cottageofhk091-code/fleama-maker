"use client";

import { useState, type FormEvent } from "react";
import { Send } from "lucide-react";

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500";

const labelClass =
  "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300";

const SUBJECTS = [
  "一般のお問い合わせ",
  "機能のご要望",
  "不具合報告",
  "決済・プランについて",
  "解約・契約について",
  "その他",
] as const;

type Props = {
  defaultSubject?: string;
  /** Prefill message (e.g. cancellation reason context) */
  defaultMessage?: string;
  submitLabel?: string;
};

export function ContactForm({
  defaultSubject = "一般のお問い合わせ",
  defaultMessage = "",
  submitLabel = "送信する",
}: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);
    setInfo(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "送信に失敗しました");
      }
      setStatus("success");
      if (typeof data.notice === "string") setInfo(data.notice);
      setName("");
      setEmail("");
      setSubject(defaultSubject);
      setMessage("");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "送信に失敗しました");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 sm:p-6"
    >
      <div className="grid gap-4">
        <div>
          <label htmlFor="contact-name" className={labelClass}>
            お名前
          </label>
          <input
            id="contact-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
            required
            autoComplete="name"
          />
        </div>
        <div>
          <label htmlFor="contact-email" className={labelClass}>
            メールアドレス
          </label>
          <input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={fieldClass}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="contact-subject" className={labelClass}>
            件名
          </label>
          <select
            id="contact-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className={fieldClass}
            required
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            {!SUBJECTS.includes(subject as (typeof SUBJECTS)[number]) && (
              <option value={subject}>{subject}</option>
            )}
          </select>
        </div>
        <div>
          <label htmlFor="contact-message" className={labelClass}>
            内容
          </label>
          <textarea
            id="contact-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={`${fieldClass} min-h-[140px] resize-y`}
            required
            placeholder="ご質問・ご要望の詳細をご記入ください"
          />
        </div>
      </div>

      {status === "success" && (
        <p className="mt-4 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
          送信を受け付けました。内容を確認のうえ、必要に応じてご連絡します。
          {info ? `（${info}）` : ""}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        {status === "loading" ? "送信中…" : submitLabel}
      </button>
    </form>
  );
}
