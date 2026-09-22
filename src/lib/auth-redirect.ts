/**
 * Auth メールリンク用の公開オリジン / コールバック URL
 * NEXT_PUBLIC_SITE_URL を優先（本番: https://fleama-maker.vercel.app）
 */
export function getAuthRedirectBase(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (env) return env;
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:3000";
}

/** 新規登録・メール確認後のコールバック */
export function getAuthCallbackUrl(nextPath = "/"): string {
  const base = getAuthRedirectBase();
  const next = nextPath.startsWith("/") ? nextPath : "/";
  if (next === "/") return `${base}/auth/callback`;
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`;
}

/** パスワードリセットメールの戻り先 */
export function getPasswordResetRedirectUrl(): string {
  return `${getAuthRedirectBase()}/auth/reset-password`;
}
