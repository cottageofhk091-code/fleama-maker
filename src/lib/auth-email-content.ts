import { escapeHtml, RESEND_APP_NAME } from "@/lib/resend-mail";
import { getAuthRedirectBase } from "@/lib/auth-redirect";

export type AuthEmailData = {
  token: string;
  token_hash: string;
  redirect_to: string;
  email_action_type: string;
  site_url: string;
  token_new?: string;
  token_hash_new?: string;
};

const ACTION_COPY: Record<
  string,
  { subject: string; heading: string; cta: string; hint: string }
> = {
  signup: {
    subject: `【${RESEND_APP_NAME}】メールアドレスの確認`,
    heading: "メールアドレスの確認",
    cta: "メールアドレスを確認する",
    hint: "このメールに心当たりがない場合は破棄してください。",
  },
  invite: {
    subject: `【${RESEND_APP_NAME}】招待のご案内`,
    heading: "アカウントへの招待",
    cta: "招待を受け入れる",
    hint: "このメールに心当たりがない場合は破棄してください。",
  },
  magiclink: {
    subject: `【${RESEND_APP_NAME}】ログインリンク`,
    heading: "マジックリンクでログイン",
    cta: "ログインする",
    hint: "このメールに心当たりがない場合は破棄してください。",
  },
  recovery: {
    subject: `【${RESEND_APP_NAME}】パスワード再設定`,
    heading: "パスワードの再設定",
    cta: "新しいパスワードを設定する",
    hint: "このメールに心当たりがない場合は破棄してください。",
  },
  email_change: {
    subject: `【${RESEND_APP_NAME}】メールアドレス変更の確認`,
    heading: "メールアドレス変更の確認",
    cta: "変更を確認する",
    hint: "このメールに心当たりがない場合は破棄してください。",
  },
  email: {
    subject: `【${RESEND_APP_NAME}】メールアドレスの確認`,
    heading: "メールアドレスの確認",
    cta: "メールアドレスを確認する",
    hint: "このメールに心当たりがない場合は破棄してください。",
  },
};

function defaultRedirectFor(action: string): string {
  const base = getAuthRedirectBase();
  if (action === "recovery") return `${base}/auth/reset-password`;
  return `${base}/auth/callback`;
}

/** Supabase Auth verify エンドポイント経由の確認リンク */
export function buildAuthActionLink(emailData: AuthEmailData): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(
    /\/$/,
    "",
  );
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }

  const redirectTo =
    emailData.redirect_to?.trim() ||
    defaultRedirectFor(emailData.email_action_type);

  const params = new URLSearchParams({
    token: emailData.token_hash,
    type: emailData.email_action_type || "email",
    redirect_to: redirectTo,
  });

  return `${supabaseUrl}/auth/v1/verify?${params.toString()}`;
}

export function buildAuthEmailContent(
  emailData: AuthEmailData,
): { subject: string; html: string; text: string } {
  const action = emailData.email_action_type || "email";
  const copy = ACTION_COPY[action] ?? ACTION_COPY.email;
  const actionLink = buildAuthActionLink(emailData);
  const safeLink = escapeHtml(actionLink);

  const text = [
    `${RESEND_APP_NAME}`,
    "",
    copy.heading,
    "",
    `次のリンクをクリックしてください:`,
    actionLink,
    "",
    `確認コード（必要な場合）: ${emailData.token}`,
    "",
    copy.hint,
  ].join("\n");

  const html = `
    <div style="font-family:sans-serif;line-height:1.6;color:#0f172a;max-width:520px;margin:0 auto;padding:24px">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;letter-spacing:0.08em;color:#0f766e;text-transform:uppercase">${escapeHtml(RESEND_APP_NAME)}</p>
      <h1 style="margin:0 0 16px;font-size:22px">${escapeHtml(copy.heading)}</h1>
      <p style="margin:0 0 20px;color:#475569">下のボタンから手続きを完了してください。リンクをクリックするとアプリへ戻ります。</p>
      <p style="margin:0 0 24px">
        <a href="${safeLink}" style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:10px">${escapeHtml(copy.cta)}</a>
      </p>
      <p style="margin:0 0 8px;font-size:12px;color:#64748b;word-break:break-all">ボタンが使えない場合: <a href="${safeLink}" style="color:#0f766e">${safeLink}</a></p>
      <p style="margin:16px 0 0;font-size:12px;color:#94a3b8">${escapeHtml(copy.hint)}</p>
    </div>
  `;

  return { subject: copy.subject, html, text };
}
