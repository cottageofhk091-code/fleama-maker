/**
 * Auth メールリンク用の公開オリジン / コールバック URL
 * NEXT_PUBLIC_SITE_URL を優先（本番: https://fleama-maker.vercel.app）
 */

export const AUTH_CONFIRMED_PATH = "/auth/confirmed";
export const PASSWORD_RESET_NOTICE_PATH = "/auth/password-reset-notice";

export function getAuthRedirectBase(request?: Request): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (env) return env;

  if (request) {
    const proto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    const host =
      request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
      request.headers.get("host")?.trim();
    if (host) return `${proto}://${host}`.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}

/** 新規登録・メール確認後 → /auth/confirmed（元タブへ戻る案内） */
export function getAuthCallbackUrl(
  _nextPath = "/",
  request?: Request,
): string {
  return `${getAuthRedirectBase(request)}${AUTH_CONFIRMED_PATH}`;
}

/** パスワードリセットメールの戻り先 → /auth/password-reset-notice */
export function getPasswordResetRedirectUrl(request?: Request): string {
  return `${getAuthRedirectBase(request)}${PASSWORD_RESET_NOTICE_PATH}`;
}
