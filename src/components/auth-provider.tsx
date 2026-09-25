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
import { RegistrationFocusSync } from "@/components/registration-focus-sync";
import { WelcomeModal } from "@/components/welcome-modal";
import { translateAuthError } from "@/lib/auth-errors";
import {
  consumeRegisteredQueryParam,
  hasRegisteredQuery,
} from "@/lib/auth-redirect";
import {
  AUTH_CHANNEL,
  AUTH_PING_KEY,
  AUTH_RECOVERY_PING_KEY,
  AUTH_UI_EVENT,
  type AuthUiEventDetail,
  clearPendingRecovery,
  clearPendingSignup,
  dispatchAuthUiEvent,
  hasPendingRecovery,
  isAuthHelperPage,
  markSignupWelcomeShown,
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
  /** 会員登録完了モーダル表示中 */
  welcomeOpen: boolean;
  closeWelcome: () => void;
  passwordRecoveryOpen: boolean;
  closePasswordRecovery: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * 注意: 会員登録・パスワード再設定メールは supabase.auth.signUp /
 * resetPasswordForEmail では送らない。
 * UI は /api/auth/signup・/api/auth/forgot-password（Resend）を直接呼ぶこと。
 *
 * 会員登録ありがとうダイアログは URL の ?registered=true で表示する
 * （メール確認後に /?registered=true へリダイレクトされる）。
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [devPersona, setDevPersona] = useState<DevPersona | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [passwordRecoveryOpen, setPasswordRecoveryOpen] = useState(false);
  const wasLoggedInRef = useRef(false);
  const welcomeShownRef = useRef(false);

  const closeAuthModals = useCallback(() => {
    dispatchAuthUiEvent({ type: "close-auth-modal" });
  }, []);

  /**
   * ?registered=true があれば歓迎モーダルを開き、直後にクエリを除去する。
   * 通常ログイン・F5（クエリ無し）では絶対に出ない。
   */
  const showWelcomeFromRegisteredQuery = useCallback(() => {
    if (welcomeShownRef.current) return false;
    if (isAuthHelperPage()) return false;
    if (!hasRegisteredQuery()) return false;

    welcomeShownRef.current = true;
    closeAuthModals();
    setWelcomeOpen(true);
    // 表示直後に URL から除去 → リロードで再表示されない
    consumeRegisteredQueryParam();
    clearPendingSignup();
    try {
      localStorage.removeItem(AUTH_PING_KEY);
    } catch {
      // ignore
    }
    void getSupabase()
      ?.auth.getSession()
      .then(({ data }) => {
        const uid = data.session?.user?.id;
        if (uid) markSignupWelcomeShown(uid);
      });
    window.setTimeout(() => closeAuthModals(), 0);
    window.setTimeout(() => closeAuthModals(), 250);
    return true;
  }, [closeAuthModals]);

  const onSessionResolved = useCallback(
    (sessionExists: boolean) => {
      if (!sessionExists) return;
      wasLoggedInRef.current = true;
      void getSupabase()
        ?.auth.getSession()
        .then(({ data }) => {
          setSession(data.session);
        });
      showWelcomeFromRegisteredQuery();
    },
    [showWelcomeFromRegisteredQuery],
  );

  const onShowWelcome = useCallback(
    (_message?: string) => {
      // 互換: 旧 Broadcast / show-welcome イベントからもクエリ方式を試す
      showWelcomeFromRegisteredQuery();
    },
    [showWelcomeFromRegisteredQuery],
  );

  const welcomeAlreadyShown = useCallback(
    () => welcomeShownRef.current,
    [],
  );

  useEffect(() => {
    // マウント時・ブラウザ戻る等で ?registered=true を拾う
    showWelcomeFromRegisteredQuery();
    const onPopState = () => {
      showWelcomeFromRegisteredQuery();
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [showWelcomeFromRegisteredQuery]);

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
      showWelcomeFromRegisteredQuery();
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
        showWelcomeFromRegisteredQuery();
        wasLoggedInRef.current = true;
      }

      if (event === "SIGNED_OUT") {
        wasLoggedInRef.current = false;
        welcomeShownRef.current = false;
        setWelcomeOpen(false);
        setPasswordRecoveryOpen(false);
      }
    });

    const onStorage = (e: StorageEvent) => {
      if (e.key === AUTH_RECOVERY_PING_KEY && e.newValue && !isAuthHelperPage()) {
        setPasswordRecoveryOpen(true);
        closeAuthModals();
      }
    };
    window.addEventListener("storage", onStorage);

    const onAuthUi = (e: Event) => {
      const detail = (e as CustomEvent<AuthUiEventDetail>).detail;
      if (!detail || isAuthHelperPage()) return;
      if (detail.type === "show-welcome") {
        showWelcomeFromRegisteredQuery();
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
        }
      };
    } catch {
      channel = null;
    }

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AUTH_UI_EVENT, onAuthUi);
      channel?.close();
    };
  }, [closeAuthModals, showWelcomeFromRegisteredQuery]);

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

  const closeWelcome = useCallback(() => {
    setWelcomeOpen(false);
    clearPendingSignup();
    const uid = session?.user?.id;
    if (uid) markSignupWelcomeShown(uid);
    welcomeShownRef.current = true;
    // 念のため残っていれば除去
    if (hasRegisteredQuery()) consumeRegisteredQueryParam();
    try {
      localStorage.removeItem(AUTH_PING_KEY);
    } catch {
      // ignore
    }
  }, [session?.user?.id]);

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
      welcomeOpen,
      closeWelcome,
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
      welcomeOpen,
      closeWelcome,
      passwordRecoveryOpen,
      closePasswordRecovery,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      <RegistrationFocusSync
        onSessionResolved={onSessionResolved}
        onShowWelcome={onShowWelcome}
        welcomeAlreadyShown={welcomeAlreadyShown}
      />
      <WelcomeModal open={welcomeOpen} onClose={closeWelcome} />
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
