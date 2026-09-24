import { NextResponse } from "next/server";
import { APP_ID, saveUserProfile } from "@/lib/analytics";
import { PROFILE_PLAN } from "@/lib/billing";
import { getAuthCallbackUrl } from "@/lib/auth-redirect";
import { sendFurimaAuthEmail } from "@/lib/furima-auth-email";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/**
 * POST /api/auth/signup
 *
 * Supabase SMTP / auth.signUp は使わない。
 * 1) admin.createUser（email_confirm: false → メール非送信）
 * 2) admin.generateLink（リンクのみ取得・メール非送信）
 * 3) Resend で From: フリマリストSold として送信
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
        { error: "サーバー側の認証設定エラーです（SERVICE_ROLE_KEY）。" },
        { status: 500 },
      );
    }

    const redirectTo = getAuthCallbackUrl("/", request);

    // 1. ユーザー作成（確認メールは送られない）
    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: { app_id: APP_ID },
      });

    if (createError) {
      const msg = createError.message.toLowerCase();
      if (
        msg.includes("already") ||
        msg.includes("registered") ||
        msg.includes("exists")
      ) {
        return NextResponse.json(
          { error: "このメールアドレスは既に登録されています。" },
          { status: 409 },
        );
      }
      console.error("[auth/signup] createUser error:", createError);
      return NextResponse.json(
        { error: createError.message || "登録に失敗しました。" },
        { status: 400 },
      );
    }

    // 2. 確認用リンクのみ生成（メールは送られない）
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo },
      });

    if (linkError) {
      console.error("[auth/signup] generateLink error:", linkError);
      return NextResponse.json(
        { error: linkError.message || "確認リンクの生成に失敗しました。" },
        { status: 500 },
      );
    }

    const actionLink = linkData.properties?.action_link;
    if (!actionLink) {
      console.error("[auth/signup] missing action_link", linkData);
      return NextResponse.json(
        { error: "確認リンクの生成に失敗しました。" },
        { status: 500 },
      );
    }

    // 3. Resend でアプリ名義メール送信
    await sendFurimaAuthEmail({
      to: email,
      kind: "signup",
      actionLink,
    });

    const userId = created.user?.id;
    if (userId) {
      await saveUserProfile({
        user_id: userId,
        plan_type: PROFILE_PLAN.free,
        free_credits: 1,
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
