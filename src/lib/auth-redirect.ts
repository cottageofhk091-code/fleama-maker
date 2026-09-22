/**
 * Auth メールリンク用の公開オリジン / コールバック URL
 * NEXT_PUBLIC_SITE_URL を優先（本番: https://fleama-maker.vercel.app）
 */
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

/** 新規登録・メール確認後のコールバック → /auth/callback */
export function getAuthCallbackUrl(
  nextPath = "/",
  request?: Request,
): string {
  const base = getAuthRedirectBase(request);
  const next = nextPath.startsWith("/") ? nextPath : "/";
  if (next === "/") return `${base}/auth/callback`;
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`;
}

/** パスワードリセットメールの戻り先 → /auth/reset-password */
export function getPasswordResetRedirectUrl(request?: Request): string {
  return `${getAuthRedirectBase(request)}/auth/reset-password`;
}
