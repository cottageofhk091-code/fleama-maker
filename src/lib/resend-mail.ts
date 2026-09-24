/**
 * Resend 経由のアプリ固有メール送信
 * From は常に固定（共有 Supabase SMTP は使わない）
 */
export const RESEND_FROM = "フリマリストSold <noreply@cloudflowriver.com>" as const;
/** メール件名用の短いアプリ名 */
export const RESEND_APP_NAME = "フリマリスト" as const;
/** From 表示名（差出人） */
export const RESEND_FROM_DISPLAY_NAME = "フリマリストSold" as const;

export type SendResendEmailParams = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export async function sendResendEmail(
  params: SendResendEmailParams,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const to = Array.isArray(params.to) ? params.to : [params.to];
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "fleama-maker-resend/1.0",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to,
      ...(params.replyTo ? { reply_to: params.replyTo } : {}),
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[resend] send failed:", res.status, body);
    throw new Error(`Resend email failed (${res.status})`);
  }
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
