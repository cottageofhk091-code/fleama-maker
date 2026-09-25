"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { PasswordRecoveryModal } from "@/components/password-recovery-modal";
import { WelcomeBanner } from "@/components/welcome-banner";
import { translateAuthError } from "@/lib/auth-errors";
import {
  AUTH_CHANNEL,
  AUTH_PING_KEY,
  AUTH_RECOVERY_PING_KEY,
  AUTH_UI_EVENT,
  PENDING_REGISTRATION_KEY,
  SIGNUP_WELCOME_MESSAGE,
  type AuthUiEventDetail,
  clearPendingRecovery,
  clearPendingSignup,
  dispatchAuthUiEvent,
  hasPendingRecovery,
  hasPendingSignup,
  isAuthHelperPage,
} from "@/lib/auth-tab-sync";
import { getSupabase } from "@/lib/supabase";
import {
  getDevPersona,
  isDevPersonaEnabled,
  subscribeDevPersona,
  type DevPersona,
} from "@/lib/billing/dev-persona";

type AuthResult = { ok: true } | { ok: false; error: string };

type AuthContextValue = {
  ready: boolean;
  user: User | null;
  session: Session | null;
  /** true when local debug forces signed-out UI */
  devUnauthenticated: boolean;
  /** ログインのみ（メール送信なし） */
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  /** パスワード更新（リセット画面用・メール送信なし） */
  updatePassword: (password: string) => Promise<AuthResult>;
  welcomeMessage: string | null;
  clearWelcomeMessage: () => void;
  passwordRecoveryOpen: boolean;
  closePasswordRecovery: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * 注意: 会員登録・パスワード再設定メールは supabase.auth.signUp /
 * resetPasswordForEmail では送らない。
 * UI は /api/auth/signup・/api/auth/forgot-password（Resend）を直接呼ぶこと。
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [devPersona, setDevPersona] = useState<DevPersona | null>(null);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [passwordRecoveryOpen, setPasswordRecoveryOpen] = useState(false);
  const wasLoggedInRef = useRef(false);
  const welcomeShownRef = useRef(false);

  const closeAuthModals = useCallback(() => {
    dispatchAuthUiEvent({ type: "close-auth-modal" });
  }, []);

  const showSignupWelcome = useCallback(
    (message?: string) => {
      closeAuthModals();
      if (welcomeShownRef.current) {
        // 二重歓迎は出さないが、モーダルは必ず閉じる
        clearPendingSignup();
        return;
      }
      welcomeShownRef.current = true;
      setWelcomeMessage(message?.trim() || SIGNUP_WELCOME_MESSAGE);
      clearPendingSignup();
      // 念のためもう一度閉じる（Header 未マウント対策）
      window.setTimeout(() => closeAuthModals(), 0);
      window.setTimeout(() => closeAuthModals(), 300);
    },
    [closeAuthModals],
  );

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setReady(true);
      return;
    }

    let mounted = true;

    const syncFromSession = async (opts?: {
      forceWelcome?: boolean;
      fromEvent?: string;
    }) => {
      if (!mounted || isAuthHelperPage()) return;
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const next = data.session;
      setSession(next);

      const pending = hasPendingSignup();
      const justLoggedIn = Boolean(next?.user) && !wasLoggedInRef.current;

      if (next?.user) {
        closeAuthModals();
        wasLoggedInRef.current = true;
        if (pending || opts?.forceWelcome) {
          showSignupWelcome();
        } else if (
          justLoggedIn &&
          (opts?.fromEvent === "SIGNED_IN" || opts?.forceWelcome)
        ) {
          // pending が消えていても AUTH_PING 直後は歓迎
          try {
            const ping = localStorage.getItem(AUTH_PING_KEY);
            if (ping) {
              const parsed = JSON.parse(ping) as { at?: number };
              if (parsed.at && Date.now() - parsed.at < 5 * 60 * 1000) {
                showSignupWelcome();
                localStorage.removeItem(AUTH_PING_KEY);
              }
            }
          } catch {
            // ignore
          }
        }
      }
    };

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      wasLoggedInRef.current = Boolean(data.session);
      setReady(true);
      if (data.session && hasPendingSignup() && !isAuthHelperPage()) {
        showSignupWelcome();
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (isAuthHelperPage()) return;

      if (
        event === "PASSWORD_RECOVERY" ||
        (hasPendingRecovery() &&
          (event === "SIGNED_IN" || event === "INITIAL_SESSION"))
      ) {
        setPasswordRecoveryOpen(true);
        clearPendingRecovery();
        closeAuthModals();
        if (event === "PASSWORD_RECOVERY") return;
      }

      if (
        (event === "SIGNED_IN" ||
          event === "INITIAL_SESSION" ||
          event === "TOKEN_REFRESHED" ||
          event === "USER_UPDATED") &&
        next?.user
      ) {
        closeAuthModals();
        if (hasPendingSignup()) {
          showSignupWelcome();
        }
        wasLoggedInRef.current = true;
      }

      if (event === "SIGNED_OUT") {
        wasLoggedInRef.current = false;
        welcomeShownRef.current = false;
        setWelcomeMessage(null);
        setPasswordRecoveryOpen(false);
      }
    });

    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key === AUTH_RECOVERY_PING_KEY && e.newValue) {
        if (!isAuthHelperPage()) {
          setPasswordRecoveryOpen(true);
          closeAuthModals();
        }
        return;
      }
      // pending_registration / auth ping / supabase session の変化
      if (
        e.key === AUTH_PING_KEY ||
        e.key === PENDING_REGISTRATION_KEY ||
        e.key.includes("auth-token") ||
        e.key.includes("sb-")
      ) {
        void syncFromSession({
          forceWelcome: e.key === AUTH_PING_KEY && Boolean(e.newValue),
        });
      }
    };
    window.addEventListener("storage", onStorage);

    const onAuthUi = (e: Event) => {
      const detail = (e as CustomEvent<AuthUiEventDetail>).detail;
      if (!detail || isAuthHelperPage()) return;
      if (detail.type === "close-auth-modal") return; // Header 側で処理
      if (detail.type === "show-welcome") {
        closeAuthModals();
        showSignupWelcome(detail.message);
        return;
      }
      if (detail.type === "signup-confirmed") {
        void syncFromSession({ forceWelcome: true });
      }
    };
    window.addEventListener(AUTH_UI_EVENT, onAuthUi);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(AUTH_CHANNEL);
      channel.onmessage = (event) => {
        if (isAuthHelperPage()) return;
        if (event?.data?.type === "password-recovery") {
          setPasswordRecoveryOpen(true);
          closeAuthModals();
          return;
        }
        if (event?.data?.type === "signup-confirmed") {
          void syncFromSession({ forceWelcome: true });
        }
      };
    } catch {
      channel = null;
    }

    const recheck = () => {
      if (document.visibilityState === "hidden" || isAuthHelperPage()) return;
      void syncFromSession({
        forceWelcome: hasPendingSignup(),
      });
    };
    document.addEventListener("visibilitychange", recheck);
    window.addEventListener("focus", recheck);
    window.addEventListener("pageshow", recheck);

    // pending 中は定期的にセッションを確認（Broadcast 取りこぼし対策）
    const pollTimer = window.setInterval(() => {
      if (!mounted || isAuthHelperPage()) return;
      if (!hasPendingSignup() && !welcomeShownRef.current) return;
      if (welcomeShownRef.current) return;
      void syncFromSession({ forceWelcome: hasPendingSignup() });
    }, 1500);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AUTH_UI_EVENT, onAuthUi);
      document.removeEventListener("visibilitychange", recheck);
      window.removeEventListener("focus", recheck);
      window.removeEventListener("pageshow", recheck);
      window.clearInterval(pollTimer);
      channel?.close();
    };
  }, [closeAuthModals, showSignupWelcome]);

  useEffect(() => {
    if (!isDevPersonaEnabled()) return;
    setDevPersona(getDevPersona());
    return subscribeDevPersona(setDevPersona);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      return { ok: false as const, error: "Supabase が未設定です。" };
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return {
        ok: false as const,
        error: translateAuthError(error.message),
      };
    }
    dispatchAuthUiEvent({ type: "close-auth-modal" });
    return { ok: true as const };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      return { ok: false as const, error: "Supabase が未設定です。" };
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return {
        ok: false as const,
        error: translateAuthError(error.message),
      };
    }
    clearPendingRecovery();
    return { ok: true as const };
  }, []);

  const clearWelcomeMessage = useCallback(() => {
    setWelcomeMessage(null);
  }, []);

  const closePasswordRecovery = useCallback(() => {
    setPasswordRecoveryOpen(false);
    clearPendingRecovery();
  }, []);

  const devUnauthenticated = devPersona === "unauthenticated";

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      user: devUnauthenticated ? null : (session?.user ?? null),
      session: devUnauthenticated ? null : session,
      devUnauthenticated,
      signIn,
      signOut,
      updatePassword,
      welcomeMessage,
      clearWelcomeMessage,
      passwordRecoveryOpen,
      closePasswordRecovery,
    }),
    [
      ready,
      session,
      devUnauthenticated,
      signIn,
      signOut,
      updatePassword,
      welcomeMessage,
      clearWelcomeMessage,
      passwordRecoveryOpen,
      closePasswordRecovery,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {welcomeMessage && (
        <WelcomeBanner
          message={welcomeMessage}
          onDismiss={clearWelcomeMessage}
        />
      )}
      {children}
      <PasswordRecoveryModal
        open={passwordRecoveryOpen}
        onClose={closePasswordRecovery}
      />
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
