import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Alias for subscription settings — redirects to account (契約管理・解約) */
export default function SettingsPage() {
  redirect("/account");
}
