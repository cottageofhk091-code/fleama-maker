import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountClient } from "@/components/account-client";
import { SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "マイページ（契約管理・解約）",
  description: `${SITE_NAME}のSold Proプラン管理・解約`,
};

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-4 py-14 text-sm text-slate-500">
          マイページを読み込み中…
        </div>
      }
    >
      <AccountClient />
    </Suspense>
  );
}
