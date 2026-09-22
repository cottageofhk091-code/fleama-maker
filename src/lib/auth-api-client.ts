/**
 * クライアント専用: Auth メール系は必ず自前 API（Resend）へ。
 * supabase.auth.signUp / resetPasswordForEmail は絶対に使わない。
 */

import { translateAuthError } from "@/lib/auth-errors";

export type AuthApiResult = { ok: true } | { ok: false; error: string };

export async function registerViaApi(
  email: string,
  password: string,
): Promise<AuthApiResult> {
  try {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      return {
        ok: false,
        error: translateAuthError(data.error || "登録に失敗しました。"),
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: translateAuthError(
        err instanceof Error ? err.message : "通信エラーが発生しました。",
      ),
    };
  }
}

export async function requestPasswordResetViaApi(
  email: string,
): Promise<AuthApiResult> {
  try {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      return {
        ok: false,
        error: translateAuthError(data.error || "送信に失敗しました。"),
      };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: translateAuthError(
        err instanceof Error ? err.message : "通信エラーが発生しました。",
      ),
    };
  }
}
