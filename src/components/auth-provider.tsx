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
  SIGNUP_WELCOME_MESSAGE,
  clearPendingRecovery,
  clearPendingSignup,
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
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);

      if (isAuthHelperPage()) return;

      if (
        event === "PASSWORD_RECOVERY" ||
        (hasPendingRecovery() && event === "SIGNED_IN")
      ) {
        setPasswordRecoveryOpen(true);
        clearPendingRecovery();
        if (event === "PASSWORD_RECOVERY") return;
      }

      if (event === "SIGNED_IN" && next?.user) {
        const pending = hasPendingSignup();
        if (pending || !wasLoggedInRef.current) {
          if (pending) {
            setWelcomeMessage(SIGNUP_WELCOME_MESSAGE);
            clearPendingSignup();
          }
        }
        wasLoggedInRef.current = true;
      }

      if (event === "SIGNED_OUT") {
        wasLoggedInRef.current = false;
        setWelcomeMessage(null);
        setPasswordRecoveryOpen(false);
      }
    });

    const onStorage = (e: StorageEvent) => {
      if (e.key === AUTH_RECOVERY_PING_KEY && e.newValue) {
        if (!isAuthHelperPage()) setPasswordRecoveryOpen(true);
        return;
      }
      if (e.key !== AUTH_PING_KEY || !e.newValue) return;
      if (isAuthHelperPage()) return;
      void supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        if (data.session && hasPendingSignup()) {
          setWelcomeMessage(SIGNUP_WELCOME_MESSAGE);
          clearPendingSignup();
        }
      });
    };
    window.addEventListener("storage", onStorage);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(AUTH_CHANNEL);
      channel.onmessage = (event) => {
        if (isAuthHelperPage()) return;
        if (event?.data?.type === "password-recovery") {
          setPasswordRecoveryOpen(true);
          return;
        }
        if (event?.data?.type === "signup-confirmed") {
          void supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            if (data.session) {
              setWelcomeMessage(SIGNUP_WELCOME_MESSAGE);
              clearPendingSignup();
            }
          });
        }
      };
    } catch {
      channel = null;
    }

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      window.removeEventListener("storage", onStorage);
      channel?.close();
    };
  }, []);

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
