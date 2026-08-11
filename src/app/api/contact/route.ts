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
    const content = [
      `📬 **${SITE_NAME} — ${kind === "cancel" ? "解約申請" : "お問い合わせ"}**`,
      `**件名:** ${subject}`,
      `**お名前:** ${name}`,
      `**メール:** ${email}`,
      "**内容:**",
      message.slice(0, 1800),
    ].join("\n");

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
        content,
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
