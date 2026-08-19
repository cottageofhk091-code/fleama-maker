import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { scrubPiiText } from "@/lib/sentry-scrub";
import { SITE_NAME } from "@/lib/site";

type ContactBody = {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
  /** Optional kind for routing (e.g. cancel) */
  kind?: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Discord 通知の「Gmailで返信」で開く事業用アカウント（表示用） */
const SUPPORT_GMAIL_ACCOUNT_DEFAULT = "nomadlabsupport@gmail.com";

/**
 * ブラウザにログイン中の Gmail アカウント番号（0=プライマリ、1=2つ目＝事業用想定）。
 * メールアドレス直指定パスは Google がプライマリへリダイレクトするため /u/{n}/ を使う。
 */
const SUPPORT_GMAIL_ACCOUNT_INDEX_DEFAULT = "1";

/**
 * 事業用 Google アカウントで Gmail 作成画面を開く URL。
 * /mail/u/{index}/ でセッション内のアカウント枠を指定する。
 */
function buildSupportGmailComposeUrl(
  customerEmail: string,
  replySubject: string,
): string {
  const rawIndex =
    process.env.SUPPORT_GMAIL_ACCOUNT_INDEX?.trim() ||
    SUPPORT_GMAIL_ACCOUNT_INDEX_DEFAULT;
  const accountIndex = /^\d+$/.test(rawIndex) ? rawIndex : SUPPORT_GMAIL_ACCOUNT_INDEX_DEFAULT;

  return (
    `https://mail.google.com/mail/u/${accountIndex}/` +
    `?view=cm&fs=1` +
    `&to=${encodeURIComponent(customerEmail)}` +
    `&su=${encodeURIComponent(replySubject)}`
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContactBody;
    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim();
    const subject = (body.subject ?? "一般のお問い合わせ").trim();
    const message = (body.message ?? "").trim();
    const kind = (body.kind ?? "").trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "お名前・メール・内容は必須です。" },
        { status: 400 },
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "メールアドレスの形式が正しくありません。" },
        { status: 400 },
      );
    }

    if (message.length > 4000) {
      return NextResponse.json(
        { error: "内容が長すぎます。" },
        { status: 400 },
      );
    }

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    const isCancel = kind === "cancel";
    const replySubject = `【お問い合わせへの返信】${SITE_NAME}`;
    const gmailComposeUrl = buildSupportGmailComposeUrl(email, replySubject);
    const supportAccount =
      process.env.SUPPORT_GMAIL_ACCOUNT?.trim() || SUPPORT_GMAIL_ACCOUNT_DEFAULT;
    const supportAccountIndex =
      process.env.SUPPORT_GMAIL_ACCOUNT_INDEX?.trim() ||
      SUPPORT_GMAIL_ACCOUNT_INDEX_DEFAULT;
    const embedMessage =
      message.length > 1000 ? `${message.slice(0, 997)}...` : message;

    // Discord 未設定でもフォーム送信は受け付ける（暫定）
    if (!webhookUrl) {
      Sentry.captureMessage(
        scrubPiiText(
          `[contact-pending] ${kind || "contact"} / ${subject} / ${name} / ${email}`,
        ),
        "info",
      );
      console.info("[contact] accepted (Discord webhook not configured)", {
        subject,
        kind: kind || "contact",
        nameLength: name.length,
        messageLength: message.length,
      });
      return NextResponse.json({
        ok: true,
        notice: "通知連携は準備中のため、運営側ログで受付しています",
      });
    }

    const discordRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: SITE_NAME,
        embeds: [
          {
            title: isCancel
              ? "📩 新しい解約申請が届きました"
              : "📩 新しいお問い合わせが届きました",
            color: 3447003,
            // **[text](url)** だと Discord がハイパーリンク化しないことがあるため、
            // リンク自体は太字で囲まず、インラインコードでメールをコピーしやすくする
            description: [
              "👤 **送信者メールアドレス:**",
              `\`${email}\` (クリックでコピー)`,
              "",
              `🚀 [✉️ 事業用Gmailで返信画面を開く](${gmailComposeUrl})`,
              `_送信元: \`${supportAccount}\`（アカウント枠 /u/${supportAccountIndex}/）_`,
            ].join("\n"),
            fields: [
              {
                name: "お名前",
                value: `${name} 様`,
                inline: true,
              },
              {
                name: "メールアドレス",
                value: `\`${email}\``,
                inline: true,
              },
              {
                name: "件名",
                value: subject,
                inline: false,
              },
              {
                name: "お問い合わせ内容",
                value: embedMessage,
              },
              {
                name: "返信アクション",
                value: `[✉️ 事業用Gmailで返信画面を開く](${gmailComposeUrl})`,
              },
            ],
          },
        ],
      }),
    });

    if (!discordRes.ok) {
      const text = await discordRes.text();
      Sentry.captureMessage(
        `Discord webhook failed: ${discordRes.status} ${scrubPiiText(text)}`,
        "error",
      );
      // 連携失敗時も受付として返す（暫定運用）
      return NextResponse.json({
        ok: true,
        notice: "受付完了（通知連携は一時的に遅延する場合があります）",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "送信中にエラーが発生しました。" },
      { status: 500 },
    );
  }
}
