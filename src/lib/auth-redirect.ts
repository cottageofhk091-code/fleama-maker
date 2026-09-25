/**
 * Auth メールリンク用の公開オリジン / コールバック URL
 *
 * 共有 Supabase プロジェクトでは Dashboard の Site URL が他アプリ
 * （例: 物件セカンドオピニオン）になっていることがある。
 * そのためメール内リンクは必ず本アプリの NEXT_PUBLIC_APP_URL を使い、
 * hashed_token 付きで /auth/confirmed 等へ直接飛ばす。
 */

export const AUTH_CONFIRMED_PATH = "/auth/confirmed";
export const PASSWORD_RESET_NOTICE_PATH = "/auth/password-reset-notice";

const FLEAMA_PRODUCTION_ORIGIN = "https://fleama-maker.vercel.app";

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

function isLocalhostUrl(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

/**
 * フリマリスト本体の公開オリジン。
 * 優先: NEXT_PUBLIC_APP_URL → NEXT_PUBLIC_SITE_URL → リクエスト Host → 本番デフォルト
 */
export function getAuthRedirectBase(request?: Request): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (appUrl) return stripTrailingSlash(appUrl);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (siteUrl) return stripTrailingSlash(siteUrl);

  if (request) {
    const proto =
      request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    const host =
      request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
      request.headers.get("host")?.trim();
    if (host && !isLocalhostUrl(host)) {
      return stripTrailingSlash(`${proto}://${host}`);
    }
  }

  if (typeof window !== "undefined" && !isLocalhostUrl(window.location.origin)) {
    return window.location.origin;
  }

  // 開発時のみ localhost。本番ビルドでは fleama-maker を既定にする
  if (process.env.NODE_ENV !== "production") {
    return "http://localhost:3000";
  }
  return FLEAMA_PRODUCTION_ORIGIN;
}

/** 新規登録・メール確認後 → /auth/confirmed */
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

/**
 * Supabase の action_link（共有 Site URL 経由）を使わず、
 * hashed_token からフリマリスト直リンクを組み立てる。
 */
export function buildAppAuthActionUrl(params: {
  tokenHash: string;
  type: "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email";
  request?: Request;
}): string {
  const path =
    params.type === "recovery"
      ? PASSWORD_RESET_NOTICE_PATH
      : AUTH_CONFIRMED_PATH;
  const url = new URL(path, `${getAuthRedirectBase(params.request)}/`);
  url.searchParams.set("token_hash", params.tokenHash);
  url.searchParams.set("type", params.type);
  return url.toString();
}

/**
 * 万一 action_link を使う場合に、redirect_to を本アプリへ強制上書きする。
 */
export function forceActionLinkRedirectTo(
  actionLink: string,
  redirectTo: string,
): string {
  try {
    const url = new URL(actionLink);
    url.searchParams.set("redirect_to", redirectTo);
    return url.toString();
  } catch {
    return actionLink;
  }
}
