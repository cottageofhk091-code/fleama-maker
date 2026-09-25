import { NextResponse } from "next/server";
import {
  buildAppAuthActionUrl,
  forceActionLinkRedirectTo,
  getPasswordResetRedirectUrl,
} from "@/lib/auth-redirect";
import { sendFurimaAuthEmail } from "@/lib/furima-auth-email";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/**
 * POST /api/auth/forgot-password
 * Admin generateLink(recovery) + Resend 直接送信
 * メール内リンクはフリマリスト /auth/password-reset-notice 直リンク
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase() ?? "";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "メールアドレスを入力してください。" },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      console.error("[auth/forgot-password] SUPABASE_SERVICE_ROLE_KEY missing");
      return NextResponse.json(
        { error: "サーバー側の認証設定エラーです。" },
        { status: 500 },
      );
    }

    const redirectTo = getPasswordResetRedirectUrl(request);
    console.info("[auth/forgot-password] redirectTo", redirectTo);

    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });

    // 存在しないメールでも成功扱い（列挙対策）。リンク生成できたときだけ送信。
    if (!error) {
      const tokenHash = data.properties?.hashed_token;
      let actionLink: string | null = null;
      if (tokenHash) {
        actionLink = buildAppAuthActionUrl({
          tokenHash,
          type: "recovery",
          request,
        });
      } else if (data.properties?.action_link) {
        actionLink = forceActionLinkRedirectTo(
          data.properties.action_link,
          redirectTo,
        );
      }

      if (actionLink) {
        console.info(
          "[auth/forgot-password] actionLink host",
          new URL(actionLink).host,
        );
        await sendFurimaAuthEmail({
          to: email,
          kind: "recovery",
          actionLink,
        });
      }
    } else {
      console.warn("[auth/forgot-password] generateLink:", error.message);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[auth/forgot-password] unexpected:", error);
    const message =
      error instanceof Error && /RESEND_API_KEY|Resend/.test(error.message)
        ? "メール送信の設定エラーです。管理者にお問い合わせください。"
        : "送信処理中にエラーが発生しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
