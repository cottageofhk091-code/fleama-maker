/**
 * メール確認 / パスワード再設定の「元タブ完結」用同期ヘルパー
 *
 * pending は localStorage（タブ間共有）を正とし、sessionStorage も併用する。
 */

export const PENDING_REGISTRATION_KEY = "fleama_pending_registration";
/** @deprecated PENDING_REGISTRATION_KEY を利用 */
export const PENDING_SIGNUP_KEY = "fleama_pending_signup";
export const PENDING_RECOVERY_KEY = "fleama_pending_recovery";
export const AUTH_PING_KEY = "fleama_auth_ping";
export const AUTH_RECOVERY_PING_KEY = "fleama_auth_recovery_ping";
export const AUTH_CHANNEL = "fleama_auth";

export const SIGNUP_WELCOME_MESSAGE =
  "会員登録ありがとうございます！Pro機能を1回無料でお試しいただけます。";

/** 元タブの Auth UI（モーダル閉鎖など）向けカスタムイベント */
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

export function markPendingSignup(email: string): void {
  const value = email.trim().toLowerCase() || "1";
  const payload = JSON.stringify({ email: value, at: Date.now() });
  try {
    // タブ間で共有（元タブ検知の本命）
    localStorage.setItem(PENDING_REGISTRATION_KEY, payload);
  } catch {
    // ignore
  }
  try {
    sessionStorage.setItem(PENDING_SIGNUP_KEY, value);
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
  try {
    sessionStorage.removeItem(PENDING_SIGNUP_KEY);
  } catch {
    // ignore
  }
}

export function hasPendingSignup(): boolean {
  try {
    if (localStorage.getItem(PENDING_REGISTRATION_KEY)) return true;
  } catch {
    // ignore
  }
  try {
    if (sessionStorage.getItem(PENDING_SIGNUP_KEY)) return true;
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
