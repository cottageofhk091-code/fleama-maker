import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "お問い合わせ | フリマ一発売却メーカー",
  description: "フリマ一発売却メーカーへのお問い合わせ",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        お問い合わせ
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        機能のご要望・不具合報告・その他のご質問はこちらからどうぞ。送信内容は Discord
        に通知されます。
      </p>
      <div className="mt-8">
        <ContactForm />
      </div>
    </div>
  );
}
