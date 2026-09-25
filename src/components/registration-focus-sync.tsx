"use client";

/**
 * タブが前面に戻った瞬間に getSession() でログイン変化を拾う。
 * 歓迎モーダル表示は AuthProvider の ?registered=true 検知に任せる。
 */
import { useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import {
  AUTH_CHANNEL,
  AUTH_PING_KEY,
  AUTH_UI_EVENT,
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

    const syncSession = async (reason: string) => {
      if (busy || isAuthHelperPage()) return;
      busy = true;
      try {
        const { data } = await supabase.auth.getSession();
        const loggedIn = Boolean(data.session?.user?.id);
        onSessionResolved(loggedIn);
        // トップ等で ?registered=true が付いている場合に拾う
        if (loggedIn && !welcomeAlreadyShown()) {
          onShowWelcome("");
        }
        if (process.env.NODE_ENV !== "production") {
          console.info("[RegistrationFocusSync]", reason, { loggedIn });
        }
      } finally {
        busy = false;
      }
    };

    const onFocus = () => {
      void syncSession("window.focus");
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void syncSession("visibilitychange");
      }
    };
    const onPageShow = () => {
      void syncSession("pageshow");
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);

    const onStorage = (e: StorageEvent) => {
      if (
        e.key === AUTH_PING_KEY ||
        (e.key && (e.key.includes("auth-token") || e.key.startsWith("sb-")))
      ) {
        void syncSession(`storage:${e.key}`);
      }
    };
    window.addEventListener("storage", onStorage);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(AUTH_CHANNEL);
      channel.onmessage = (event) => {
        if (event?.data?.type === "signup-confirmed") {
          void syncSession("broadcast");
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
        void syncSession("auth-ui");
      }
    };
    window.addEventListener(AUTH_UI_EVENT, onAuthUi);

    void syncSession("mount");

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AUTH_UI_EVENT, onAuthUi);
      channel?.close();
    };
  }, [onSessionResolved, onShowWelcome, welcomeAlreadyShown]);

  return null;
}
