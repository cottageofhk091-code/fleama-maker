import { Suspense } from "react";
import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "新しいパスワードの設定",
  description: `${SITE_NAME}のパスワード更新`,
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center py-16 text-sm text-slate-500">
          読み込み中…
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
