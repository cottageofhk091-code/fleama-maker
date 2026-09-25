/**
 * メール確認 / パスワード再設定の「元タブ完結」用同期ヘルパー
 */

export const PENDING_SIGNUP_KEY = "fleama_pending_signup";
export const PENDING_RECOVERY_KEY = "fleama_pending_recovery";
export const AUTH_PING_KEY = "fleama_auth_ping";
export const AUTH_RECOVERY_PING_KEY = "fleama_auth_recovery_ping";
export const AUTH_CHANNEL = "fleama_auth";

export const SIGNUP_WELCOME_MESSAGE =
  "会員登録が完了しました！Pro機能を1回無料でお試しいただけます。";

/** 元タブの Auth UI（モーダル閉鎖など）向けカスタムイベント */
export const AUTH_UI_EVENT = "fleama_auth_ui";

export type AuthUiEventDetail =
  | { type: "signup-confirmed"; bonusGranted?: boolean }
  | { type: "close-auth-modal" }
  | { type: "password-recovery" };

export function dispatchAuthUiEvent(detail: AuthUiEventDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_UI_EVENT, { detail }));
}

export function markPendingSignup(email: string): void {
  try {
    sessionStorage.setItem(PENDING_SIGNUP_KEY, email.trim().toLowerCase());
  } catch {
    // ignore
  }
}

export function clearPendingSignup(): void {
  try {
    sessionStorage.removeItem(PENDING_SIGNUP_KEY);
  } catch {
    // ignore
  }
}

export function hasPendingSignup(): boolean {
  try {
    return Boolean(sessionStorage.getItem(PENDING_SIGNUP_KEY));
  } catch {
    return false;
  }
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
  // 確認タブ自身でもモーダル閉鎖・歓迎表示を起こせるよう同タブ向けにも通知
  dispatchAuthUiEvent({ type: "signup-confirmed", ...payload });
  dispatchAuthUiEvent({ type: "close-auth-modal" });
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
}
