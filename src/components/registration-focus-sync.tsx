"use client";

/**
 * タブが前面に戻った瞬間に getSession() でログイン変化を拾う。
 * pending_registration === true && session あり → 歓迎モーダル表示を依頼。
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
} from "@/lib/auth-tab-sync";

type Props = {
  onSessionResolved: (sessionExists: boolean) => void;
  onShowWelcome: (message: string) => void;
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

        dispatchAuthUiEvent({ type: "close-auth-modal" });

        // 既に表示済み → pending だけ掃除（モーダルは出さない）
        if (alreadyShown) {
          if (pending) clearPendingSignup();
          try {
            localStorage.removeItem(AUTH_PING_KEY);
          } catch {
            // ignore
          }
          return;
        }

        // 仕様: pending_registration === true のときだけ歓迎
        if (pending) {
          onShowWelcome(SIGNUP_WELCOME_MESSAGE);
          return;
        }

        // pending が他経路で消えた競合対策: 直近 AUTH_PING のみ
        try {
          const ping = localStorage.getItem(AUTH_PING_KEY);
          if (ping) {
            const parsed = JSON.parse(ping) as { at?: number };
            if (parsed.at && Date.now() - parsed.at < 5 * 60 * 1000) {
              // ping がある＝確認タブ完了。pending が無い場合でも一度だけ促す
              // （元タブで pending が残っているのが正常系）
              onShowWelcome(SIGNUP_WELCOME_MESSAGE);
            }
          }
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
      if (
        detail?.type === "signup-confirmed" ||
        detail?.type === "show-welcome"
      ) {
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
