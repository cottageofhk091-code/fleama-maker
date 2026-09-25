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

  const showSignupWelcome = useCallback(() => {
    if (welcomeShownRef.current) return;
    welcomeShownRef.current = true;
    setWelcomeMessage(SIGNUP_WELCOME_MESSAGE);
    clearPendingSignup();
    dispatchAuthUiEvent({ type: "close-auth-modal" });
  }, []);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setReady(true);
      return;
    }

    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      wasLoggedInRef.current = Boolean(data.session);
      setReady(true);
      // 確認完了後に元タブへ戻った直後など、既にセッションがある場合
      if (data.session && hasPendingSignup() && !isAuthHelperPage()) {
        showSignupWelcome();
      }
    });

    const handleSessionEstablished = (
      event: string,
      next: Session | null,
    ) => {
      setSession(next);

      if (isAuthHelperPage()) return;

      if (
        event === "PASSWORD_RECOVERY" ||
        (hasPendingRecovery() &&
          (event === "SIGNED_IN" || event === "INITIAL_SESSION"))
      ) {
        setPasswordRecoveryOpen(true);
        clearPendingRecovery();
        dispatchAuthUiEvent({ type: "close-auth-modal" });
        if (event === "PASSWORD_RECOVERY") return;
      }

      if (
        (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
        next?.user
      ) {
        // ログイン成立 → 認証モーダルを必ず閉じる
        dispatchAuthUiEvent({ type: "close-auth-modal" });

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
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      handleSessionEstablished(event, next);
    });

    const hydrateAfterConfirm = (opts?: { forceWelcome?: boolean }) => {
      if (isAuthHelperPage()) return;
      void (async () => {
        for (let i = 0; i < 6; i += 1) {
          const { data } = await supabase.auth.getSession();
          if (!mounted) return;
          if (data.session) {
            setSession(data.session);
            wasLoggedInRef.current = true;
            dispatchAuthUiEvent({ type: "close-auth-modal" });
            if (opts?.forceWelcome || hasPendingSignup()) {
              showSignupWelcome();
            }
            return;
          }
          await new Promise((r) => window.setTimeout(r, 400));
        }
        dispatchAuthUiEvent({ type: "close-auth-modal" });
        if (opts?.forceWelcome || hasPendingSignup()) {
          showSignupWelcome();
        }
      })();
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === AUTH_RECOVERY_PING_KEY && e.newValue) {
        if (!isAuthHelperPage()) {
          setPasswordRecoveryOpen(true);
          dispatchAuthUiEvent({ type: "close-auth-modal" });
        }
        return;
      }
      if (e.key !== AUTH_PING_KEY || !e.newValue) return;
      hydrateAfterConfirm({ forceWelcome: true });
    };
    window.addEventListener("storage", onStorage);

    const onAuthUi = (e: Event) => {
      const detail = (e as CustomEvent<AuthUiEventDetail>).detail;
      if (!detail || isAuthHelperPage()) return;
      if (detail.type === "signup-confirmed") {
        hydrateAfterConfirm({ forceWelcome: true });
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
          dispatchAuthUiEvent({ type: "close-auth-modal" });
          return;
        }
        if (event?.data?.type === "signup-confirmed") {
          hydrateAfterConfirm({ forceWelcome: true });
        }
      };
    } catch {
      channel = null;
    }

    // タブが前面に戻ったときも pending + session を再確認
    const onVisible = () => {
      if (document.visibilityState !== "visible" || isAuthHelperPage()) return;
      void supabase.auth.getSession().then(({ data }) => {
        if (!mounted) return;
        if (data.session) {
          setSession(data.session);
          dispatchAuthUiEvent({ type: "close-auth-modal" });
          if (hasPendingSignup()) showSignupWelcome();
        }
      });
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AUTH_UI_EVENT, onAuthUi);
      document.removeEventListener("visibilitychange", onVisible);
      channel?.close();
    };
  }, [showSignupWelcome]);

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
