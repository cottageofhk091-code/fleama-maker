/**
 * クライアント専用: Auth メール系は必ず自前 API（Resend）へ。
 * supabase.auth.signUp / resetPasswordForEmail は絶対に使わない。
 */

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
      return { ok: false, error: data.error || "登録に失敗しました。" };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "通信エラーが発生しました。しばらくしてから再度お試しください。",
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
      return { ok: false, error: data.error || "送信に失敗しました。" };
    }
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: "通信エラーが発生しました。しばらくしてから再度お試しください。",
    };
  }
}
