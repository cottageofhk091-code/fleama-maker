import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { scrubPiiText } from "@/lib/sentry-scrub";

type ContactBody = {
  name?: string;
  email?: string;
  message?: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ContactBody;
    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim();
    const message = (body.message ?? "").trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "お名前・メール・メッセージは必須です。" },
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
        { error: "メッセージが長すぎます。" },
        { status: 400 },
      );
    }

    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      return NextResponse.json(
        { error: "お問い合わせ受付の設定が未完了です。" },
        { status: 503 },
      );
    }

    const content = [
      "📬 **フリマ一発売却メーカー — お問い合わせ**",
      `**お名前:** ${name}`,
      `**メール:** ${email}`,
      "**メッセージ:**",
      message.slice(0, 1800),
    ].join("\n");

    const discordRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "フリマ一発売却メーカー",
        content,
      }),
    });

    if (!discordRes.ok) {
      const text = await discordRes.text();
      Sentry.captureMessage(
        `Discord webhook failed: ${discordRes.status} ${scrubPiiText(text)}`,
        "error",
      );
      return NextResponse.json(
        { error: "通知の送信に失敗しました。時間をおいて再度お試しください。" },
        { status: 502 },
      );
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
