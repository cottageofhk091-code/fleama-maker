import { NextResponse } from "next/server";
import { APP_ID } from "@/lib/analytics";
import {
  buildAppAuthActionUrl,
  forceActionLinkRedirectTo,
  getAuthCallbackUrl,
} from "@/lib/auth-redirect";
import { ensureSignupProfile } from "@/lib/billing/free-credits-server";
import { sendFurimaAuthEmail } from "@/lib/furima-auth-email";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";

/**
 * POST /api/auth/signup
 *
 * Supabase SMTP / auth.signUp は使わない。
 * 1) admin.createUser（email_confirm: false → メール非送信）
 * 2) admin.generateLink（リンクのみ取得・メール非送信）
 * 3) hashed_token からフリマリスト /auth/confirmed 直リンクを組み立て Resend 送信
 *    （共有 Supabase の Site URL＝他アプリへの誤リダイレクトを回避）
 * 4) profiles.free_credits=1 を Service Role で確実に作成
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
    console.info("[auth/signup] redirectTo", redirectTo);

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
    // type: signup + password で確認用トークンを取得
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "signup",
        email,
        password,
        options: { redirectTo },
      });

    if (linkError) {
      console.error("[auth/signup] generateLink(signup) error:", linkError);
      // フォールバック: magiclink
      const fallback = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo },
      });
      if (fallback.error || !fallback.data.properties?.hashed_token) {
        console.error(
          "[auth/signup] generateLink fallback error:",
          fallback.error,
        );
        return NextResponse.json(
          { error: linkError.message || "確認リンクの生成に失敗しました。" },
          { status: 500 },
        );
      }

      const tokenHash = fallback.data.properties.hashed_token;
      const actionLink = buildAppAuthActionUrl({
        tokenHash,
        type: "magiclink",
        request,
      });
      await sendFurimaAuthEmail({ to: email, kind: "signup", actionLink });
    } else {
      const tokenHash = linkData.properties?.hashed_token;
      if (!tokenHash) {
        // hashed_token が無い場合のみ action_link を使い、redirect_to を強制上書き
        const raw = linkData.properties?.action_link;
        if (!raw) {
          console.error("[auth/signup] missing token/link", linkData);
          return NextResponse.json(
            { error: "確認リンクの生成に失敗しました。" },
            { status: 500 },
          );
        }
        const actionLink = forceActionLinkRedirectTo(raw, redirectTo);
        console.warn(
          "[auth/signup] hashed_token missing; rewriting action_link redirect_to",
          { redirectTo },
        );
        await sendFurimaAuthEmail({ to: email, kind: "signup", actionLink });
      } else {
        const actionLink = buildAppAuthActionUrl({
          tokenHash,
          type: "signup",
          request,
        });
        console.info("[auth/signup] actionLink host", new URL(actionLink).host);
        await sendFurimaAuthEmail({ to: email, kind: "signup", actionLink });
      }
    }

    const userId = created.user?.id;
    if (userId) {
      await ensureSignupProfile(userId);
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
