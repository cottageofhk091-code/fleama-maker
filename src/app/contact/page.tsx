import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "お問い合わせ",
  description: `${SITE_NAME}へのお問い合わせ`,
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        お問い合わせ
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        機能のご要望・不具合報告・決済／解約など、下記フォームよりご連絡ください。
      </p>
      <p className="mt-2 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
        ※外部通知（Discord）連携は準備中です。フォーム送信は受け付けており、運営が内容を確認します。
      </p>
      <div className="mt-8">
        <ContactForm />
      </div>
    </div>
  );
}
