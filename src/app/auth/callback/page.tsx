import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthCallbackClient } from "@/components/auth-callback-client";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "ログイン確認",
  description: `${SITE_NAME}のメール認証コールバック`,
  robots: { index: false, follow: false },
};

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center py-16 text-sm text-slate-500">
          読み込み中…
        </div>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}
