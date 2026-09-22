import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "パスワードを忘れた方",
  description: `${SITE_NAME}のパスワード再設定`,
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
