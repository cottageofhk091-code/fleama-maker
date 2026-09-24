import { escapeHtml, RESEND_APP_NAME, sendResendEmail } from "@/lib/resend-mail";

type AuthMailKind = "signup" | "recovery";

const MAIL: Record<
  AuthMailKind,
  { subject: string; heading: string; cta: string; body: string }
> = {
  signup: {
    subject: `【${RESEND_APP_NAME}】会員登録のご確認`,
    heading: "会員登録のご確認",
    cta: "登録を完了する",
    body: "下のボタンからメールアドレスを確認し、会員登録を完了してください。確認後は元の画面（タブ）に戻ってご利用ください。",
  },
  recovery: {
    subject: `【${RESEND_APP_NAME}】パスワード再設定のご案内`,
    heading: "パスワード再設定のご案内",
    cta: "パスワードを再設定する",
    body: "下のボタンから認証を完了したあと、元の画面（タブ）に戻り新しいパスワードを入力してください。",
  },
};

/**
 * Auth 系メールを Resend で送信。
 * From は sendResendEmail 内で常に フリマリストSold <noreply@cloudflowriver.com>
 */
export async function sendFurimaAuthEmail(params: {
  to: string;
  kind: AuthMailKind;
  actionLink: string;
}): Promise<void> {
  const copy = MAIL[params.kind];
  const safeLink = escapeHtml(params.actionLink);

  const text = [
    RESEND_APP_NAME,
    "",
    copy.heading,
    "",
    copy.body,
    "",
    `${copy.cta}:`,
    params.actionLink,
    "",
    "このメールに心当たりがない場合は破棄してください。",
  ].join("\n");

  const html = `
    <div style="font-family:sans-serif;line-height:1.6;color:#0f172a;max-width:520px;margin:0 auto;padding:24px">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:0.08em;color:#0f766e">${escapeHtml(RESEND_APP_NAME)}</p>
      <h1 style="margin:0 0 16px;font-size:22px">${escapeHtml(copy.heading)}</h1>
      <p style="margin:0 0 20px;color:#475569">${escapeHtml(copy.body)}</p>
      <p style="margin:0 0 24px">
        <a href="${safeLink}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px">${escapeHtml(copy.cta)}</a>
      </p>
      <p style="margin:0 0 8px;font-size:12px;color:#64748b;word-break:break-all">ボタンが使えない場合:<br/><a href="${safeLink}" style="color:#0f766e">${safeLink}</a></p>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8">このメールに心当たりがない場合は破棄してください。</p>
    </div>
  `;

  await sendResendEmail({
    to: params.to,
    subject: copy.subject,
    html,
    text,
  });
}
