import { NextResponse } from "next/server";
import {
  escapeHtml,
  RESEND_APP_NAME,
  sendResendEmail,
} from "@/lib/resend-mail";

const DEFAULT_CONTACT_EMAIL = "support@cloudflowriver.com";

function getContactEmail(): string {
  return (process.env.CONTACT_EMAIL || DEFAULT_CONTACT_EMAIL).trim();
}

export async function POST(request: Request) {
  try {
    const { name, email, type, message } = await request.json();

    if (!email || !message) {
      return NextResponse.json(
        { error: "メールアドレスとお問い合わせ内容は必須です。" },
        { status: 400 },
      );
    }

    const contactEmail = getContactEmail();
    if (!contactEmail.includes("@")) {
      console.error("[contact] CONTACT_EMAIL is invalid:", contactEmail);
      return NextResponse.json(
        { error: "サーバー側の設定エラーです。" },
        { status: 500 },
      );
    }

    const trimmedEmail = String(email).trim();
    const displayName = name?.trim() ? String(name).trim() : "（未入力）";
    const inquiryType = type ? String(type).trim() : "";
    const inquiryMessage = String(message).trim();

    const subject = `【${RESEND_APP_NAME}】お問い合わせ: ${inquiryType || "一般"}`;
    const textBody = [
      `${RESEND_APP_NAME} にお問い合わせが届きました。`,
      "",
      `お名前: ${displayName}`,
      `メールアドレス: ${trimmedEmail}`,
      `種別: ${inquiryType || "（未選択）"}`,
      "",
      "--- お問い合わせ内容 ---",
      inquiryMessage,
      "",
      `通知先: ${contactEmail}`,
    ].join("\n");

    const htmlBody = `
    <div style="font-family:sans-serif;line-height:1.6;color:#0f172a">
      <h2 style="margin:0 0 12px">${escapeHtml(RESEND_APP_NAME)}｜新しいお問い合わせ</h2>
      <p style="margin:0 0 8px"><strong>お名前:</strong> ${escapeHtml(displayName)}</p>
      <p style="margin:0 0 8px"><strong>メールアドレス:</strong> ${escapeHtml(trimmedEmail)}</p>
      <p style="margin:0 0 16px"><strong>種別:</strong> ${escapeHtml(inquiryType || "（未選択）")}</p>
      <div style="padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;white-space:pre-wrap">${escapeHtml(inquiryMessage)}</div>
      <p style="margin:16px 0 0;font-size:12px;color:#64748b">このメールに返信すると、お客様（${escapeHtml(trimmedEmail)}）へ返信できます。</p>
    </div>
  `;

    await sendResendEmail({
      to: contactEmail,
      replyTo: trimmedEmail,
      subject,
      text: textBody,
      html: htmlBody,
    });

    return NextResponse.json({ success: true, notified: contactEmail });
  } catch (error) {
    console.error("Contact Error:", error);
    const message =
      error instanceof Error && /RESEND_API_KEY|Resend email failed/.test(error.message)
        ? "サーバー側のメール設定エラーです。管理者にお問い合わせください。"
        : "送信中にエラーが発生しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
