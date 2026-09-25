"use client";

/**
 * タブが前面に戻った瞬間に getSession() でログイン変化を拾う。
 * バックグラウンド中に onAuthStateChange がスキップされる問題の対策。
 */
import { useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  AUTH_CHANNEL,
  AUTH_PING_KEY,
  AUTH_UI_EVENT,
  PENDING_REGISTRATION_KEY,
  SIGNUP_WELCOME_MESSAGE,
  clearPendingSignup,
  dispatchAuthUiEvent,
  hasPendingSignup,
  hasSignupWelcomeShown,
  isAuthHelperPage,
  markSignupWelcomeShown,
} from "@/lib/auth-tab-sync";

type Props = {
  /** セッション反映コールバック（AuthProvider から渡す） */
  onSessionResolved: (sessionExists: boolean) => void;
  /** 歓迎メッセージ表示 */
  onShowWelcome: (message: string) => void;
  /** 既に歓迎済みなら true（メモリ） */
  welcomeAlreadyShown: () => boolean;
};

export function RegistrationFocusSync({
  onSessionResolved,
  onShowWelcome,
  welcomeAlreadyShown,
}: Props) {
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    let busy = false;

    const completeRegistrationIfNeeded = async (reason: string) => {
      if (busy || isAuthHelperPage()) return;
      busy = true;
      try {
        const { data } = await supabase.auth.getSession();
        const userId = data.session?.user?.id ?? null;
        const loggedIn = Boolean(userId);
        onSessionResolved(loggedIn);

        const pending = hasPendingSignup();
        const alreadyShown =
          welcomeAlreadyShown() || hasSignupWelcomeShown(userId);

        console.info("[RegistrationFocusSync]", reason, {
          loggedIn,
          pending,
          alreadyShown,
        });

        if (!loggedIn) return;

        // ログイン済みなら認証モーダルは常に閉じる
        dispatchAuthUiEvent({ type: "close-auth-modal" });

        // 既に感謝ダイアログ表示済み → フラグ掃除のみ（再表示しない）
        if (alreadyShown) {
          clearPendingSignup();
          try {
            localStorage.removeItem(AUTH_PING_KEY);
          } catch {
            // ignore
          }
          return;
        }

        if (!pending) {
          // AUTH_PING 直近のみ歓迎（pending が消えた競合対策）
          // ただし welcome 表示済みユーザーでは絶対に再表示しない
          try {
            const ping = localStorage.getItem(AUTH_PING_KEY);
            if (ping) {
              const parsed = JSON.parse(ping) as { at?: number };
              if (parsed.at && Date.now() - parsed.at < 5 * 60 * 1000) {
                onShowWelcome(SIGNUP_WELCOME_MESSAGE);
                markSignupWelcomeShown(userId);
                localStorage.removeItem(AUTH_PING_KEY);
                clearPendingSignup();
              }
            }
          } catch {
            // ignore
          }
          return;
        }

        // pending_registration === true && session あり → 完了フロー（1回限り）
        onShowWelcome(SIGNUP_WELCOME_MESSAGE);
        markSignupWelcomeShown(userId);
        clearPendingSignup();
        dispatchAuthUiEvent({ type: "close-auth-modal" });
        try {
          localStorage.removeItem(AUTH_PING_KEY);
        } catch {
          // ignore
        }
      } finally {
        busy = false;
      }
    };

    const onFocus = () => {
      void completeRegistrationIfNeeded("window.focus");
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void completeRegistrationIfNeeded("visibilitychange");
      }
    };
    const onPageShow = () => {
      void completeRegistrationIfNeeded("pageshow");
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);

    const onStorage = (e: StorageEvent) => {
      if (
        e.key === AUTH_PING_KEY ||
        e.key === PENDING_REGISTRATION_KEY ||
        (e.key && (e.key.includes("auth-token") || e.key.startsWith("sb-")))
      ) {
        void completeRegistrationIfNeeded(`storage:${e.key}`);
      }
    };
    window.addEventListener("storage", onStorage);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(AUTH_CHANNEL);
      channel.onmessage = (event) => {
        if (event?.data?.type === "signup-confirmed") {
          void completeRegistrationIfNeeded("broadcast");
        }
      };
    } catch {
      channel = null;
    }

    const onAuthUi = (e: Event) => {
      const detail = (e as CustomEvent<{ type?: string }>).detail;
      if (detail?.type === "signup-confirmed" || detail?.type === "show-welcome") {
        void completeRegistrationIfNeeded("auth-ui");
      }
    };
    window.addEventListener(AUTH_UI_EVENT, onAuthUi);

    const poll = window.setInterval(() => {
      if (hasPendingSignup() && document.visibilityState === "visible") {
        void completeRegistrationIfNeeded("poll");
      }
    }, 2000);

    void completeRegistrationIfNeeded("mount");

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AUTH_UI_EVENT, onAuthUi);
      window.clearInterval(poll);
      channel?.close();
    };
  }, [onSessionResolved, onShowWelcome, welcomeAlreadyShown]);

  return null;
}
