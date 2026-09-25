/**
 * メール確認後の「元タブ完結」用フラグ / 同期ヘルパー
 *
 * 仕様キー: localStorage `pending_registration` = "true"
 * （バックグラウンド中に onAuthStateChange がスキップされても、
 *  タブ focus / visibilitychange で getSession して判定する）
 */

/** 仕様どおりのキー名 */
export const PENDING_REGISTRATION_KEY = "pending_registration";

/** 旧キー（移行・掃除用） */
const LEGACY_PENDING_KEYS = [
  "fleama_pending_registration",
  "fleama_pending_signup",
] as const;

export const PENDING_RECOVERY_KEY = "fleama_pending_recovery";
export const AUTH_PING_KEY = "fleama_auth_ping";
export const AUTH_RECOVERY_PING_KEY = "fleama_auth_recovery_ping";
export const AUTH_CHANNEL = "fleama_auth";

export const SIGNUP_WELCOME_TITLE = "🎉 会員登録が完了しました！";
export const SIGNUP_WELCOME_BODY =
  "ご登録いただきありがとうございます。Pro機能を1回無料でお試しいただけます。さっそく機能をご利用ください！";
/** 互換: 旧バナー用の一文 */
export const SIGNUP_WELCOME_MESSAGE = SIGNUP_WELCOME_BODY;

export const AUTH_UI_EVENT = "fleama_auth_ui";

export type AuthUiEventDetail =
  | { type: "signup-confirmed"; bonusGranted?: boolean }
  | { type: "close-auth-modal" }
  | { type: "password-recovery" }
  | { type: "show-welcome"; message?: string };

export function dispatchAuthUiEvent(detail: AuthUiEventDetail): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(AUTH_UI_EVENT, { detail }));
  } catch {
    // ignore
  }
}

/** 新規登録メール送信直後に呼ぶ */
export function markPendingSignup(_email?: string): void {
  try {
    localStorage.setItem(PENDING_REGISTRATION_KEY, "true");
  } catch {
    // ignore
  }
}

export function clearPendingSignup(): void {
  try {
    localStorage.removeItem(PENDING_REGISTRATION_KEY);
  } catch {
    // ignore
  }
  for (const key of LEGACY_PENDING_KEYS) {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

export function hasPendingSignup(): boolean {
  try {
    if (localStorage.getItem(PENDING_REGISTRATION_KEY) === "true") return true;
    // 旧実装互換
    for (const key of LEGACY_PENDING_KEYS) {
      if (localStorage.getItem(key) || sessionStorage.getItem(key)) return true;
    }
  } catch {
    // ignore
  }
  return false;
}

export function markPendingRecovery(email: string): void {
  try {
    sessionStorage.setItem(PENDING_RECOVERY_KEY, email.trim().toLowerCase());
  } catch {
    // ignore
  }
}

export function clearPendingRecovery(): void {
  try {
    sessionStorage.removeItem(PENDING_RECOVERY_KEY);
  } catch {
    // ignore
  }
}

export function hasPendingRecovery(): boolean {
  try {
    return Boolean(sessionStorage.getItem(PENDING_RECOVERY_KEY));
  } catch {
    return false;
  }
}

export function isAuthHelperPage(pathname?: string): boolean {
  const path =
    pathname ??
    (typeof window !== "undefined" ? window.location.pathname : "");
  return (
    path.startsWith("/auth/confirmed") ||
    path.startsWith("/auth/password-reset-notice") ||
    path.startsWith("/auth/callback") ||
    path.startsWith("/auth/reset-password")
  );
}

export function notifySignupConfirmed(payload: { bonusGranted?: boolean } = {}): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      AUTH_PING_KEY,
      JSON.stringify({ at: Date.now(), ...payload }),
    );
  } catch {
    // ignore
  }
  try {
    const channel = new BroadcastChannel(AUTH_CHANNEL);
    channel.postMessage({ type: "signup-confirmed", ...payload });
    channel.close();
  } catch {
    // ignore
  }
  dispatchAuthUiEvent({ type: "close-auth-modal" });
  dispatchAuthUiEvent({ type: "signup-confirmed", ...payload });
  dispatchAuthUiEvent({
    type: "show-welcome",
    message: SIGNUP_WELCOME_MESSAGE,
  });
}

export function notifyPasswordRecovery(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      AUTH_RECOVERY_PING_KEY,
      JSON.stringify({ at: Date.now() }),
    );
  } catch {
    // ignore
  }
  try {
    const channel = new BroadcastChannel(AUTH_CHANNEL);
    channel.postMessage({ type: "password-recovery" });
    channel.close();
  } catch {
    // ignore
  }
  dispatchAuthUiEvent({ type: "password-recovery" });
  dispatchAuthUiEvent({ type: "close-auth-modal" });
}
