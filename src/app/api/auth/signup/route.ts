import { NextResponse } from "next/server";
import { APP_ID, saveUserProfile } from "@/lib/analytics";
import { PROFILE_PLAN } from "@/lib/billing";
import { getAuthCallbackUrl } from "@/lib/auth-redirect";
import { sendFurimaAuthEmail } from "@/lib/furima-auth-email";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/**
 * POST /api/auth/signup
 * Admin generateLink(signup) + Resend 直接送信
 * From: フリマリストSold <noreply@cloudflowriver.com>
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "メールアドレスを入力してください。" },
        { status: 400 },
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "パスワードは6文字以上にしてください。" },
        { status: 400 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (!supabaseAdmin) {
      console.error("[auth/signup] SUPABASE_SERVICE_ROLE_KEY is not set");
      return NextResponse.json(
        { error: "サーバー側の認証設定エラーです。" },
        { status: 500 },
      );
    }

    const redirectTo = getAuthCallbackUrl("/", request);
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: {
        data: { app_id: APP_ID },
        redirectTo,
      },
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered")) {
        return NextResponse.json(
          { error: "このメールアドレスは既に登録されています。" },
          { status: 409 },
        );
      }
      console.error("[auth/signup] generateLink error:", error);
      return NextResponse.json(
        { error: error.message || "登録に失敗しました。" },
        { status: 400 },
      );
    }

    const actionLink = data.properties?.action_link;
    if (!actionLink) {
      console.error("[auth/signup] missing action_link", data);
      return NextResponse.json(
        { error: "確認リンクの生成に失敗しました。" },
        { status: 500 },
      );
    }

    await sendFurimaAuthEmail({
      to: email,
      kind: "signup",
      actionLink,
    });

    const userId = data.user?.id;
    if (userId) {
      await saveUserProfile({
        user_id: userId,
        plan_type: PROFILE_PLAN.free,
        has_used_pro_trial: false,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[auth/signup] unexpected:", error);
    const message =
      error instanceof Error && /RESEND_API_KEY|Resend/.test(error.message)
        ? "メール送信の設定エラーです。管理者にお問い合わせください。"
        : "登録処理中にエラーが発生しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
