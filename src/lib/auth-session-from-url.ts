"use client";

import { getSupabase } from "@/lib/supabase";

type AuthUrlResult =
  | { ok: true; type: "session" | "none" }
  | { ok: false; error: string };

/**
 * メールリンクの ?code= / ?token_hash= からブラウザセッションを確立する
 *（localStorage ベースのクライアント Auth と整合）
 */
export async function establishSessionFromUrl(
  searchParams: URLSearchParams,
): Promise<AuthUrlResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { ok: false, error: "Supabase が未設定です。" };
  }

  const code = searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, type: "session" };
  }

  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as
        | "signup"
        | "invite"
        | "magiclink"
        | "recovery"
        | "email_change"
        | "email",
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, type: "session" };
  }

  // detectSessionInUrl がハッシュを処理済みの場合
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    return { ok: true, type: "session" };
  }

  return { ok: true, type: "none" };
}

export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}
