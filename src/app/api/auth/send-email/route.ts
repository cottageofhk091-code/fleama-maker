import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { buildAuthEmailContent, type AuthEmailData } from "@/lib/auth-email-content";
import { sendResendEmail } from "@/lib/resend-mail";

export const runtime = "nodejs";

type SendEmailHookPayload = {
  user: { email?: string | null };
  email_data: AuthEmailData;
};

function getHookSecret(): string | null {
  const raw = process.env.SEND_EMAIL_HOOK_SECRET?.trim();
  if (!raw) return null;
  // Supabase は "v1,whsec_..." 形式で渡すことがある
  return raw.replace(/^v1,/, "");
}

/**
 * Supabase Auth 「Send Email」Hook
 * Dashboard → Authentication → Hooks → Send Email → HTTPS
 * URL: https://fleama-maker.vercel.app/api/auth/send-email
 *
 * From は常に フリマリストSold <noreply@cloudflowriver.com>
 */
export async function POST(request: Request) {
  const secret = getHookSecret();
  if (!secret) {
    console.error("[auth/send-email] SEND_EMAIL_HOOK_SECRET is not set");
    return NextResponse.json(
      { error: { message: "Hook secret not configured", http_code: 500 } },
      { status: 500 },
    );
  }

  const payload = await request.text();
  const headers = Object.fromEntries(request.headers.entries());

  let data: SendEmailHookPayload;
  try {
    const wh = new Webhook(secret);
    data = wh.verify(payload, headers) as SendEmailHookPayload;
  } catch (error) {
    console.error("[auth/send-email] webhook verify failed:", error);
    return NextResponse.json(
      {
        error: {
          http_code: 401,
          message:
            error instanceof Error ? error.message : "Webhook verification failed",
        },
      },
      { status: 401 },
    );
  }

  const to = data.user?.email?.trim();
  if (!to) {
    return NextResponse.json(
      { error: { http_code: 400, message: "Missing user email" } },
      { status: 400 },
    );
  }

  try {
    const content = buildAuthEmailContent(data.email_data);
    await sendResendEmail({
      to,
      subject: content.subject,
      html: content.html,
      text: content.text,
    });
  } catch (error) {
    console.error("[auth/send-email] Resend failed:", error);
    return NextResponse.json(
      {
        error: {
          http_code: 500,
          message:
            error instanceof Error ? error.message : "Failed to send email",
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({});
}
