"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
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
  signUp: (email: string, password: string) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [devPersona, setDevPersona] = useState<DevPersona | null>(null);

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
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isDevPersonaEnabled()) return;
    setDevPersona(getDevPersona());
    return subscribeDevPersona(setDevPersona);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        return {
          ok: false as const,
          error: data.error || "登録に失敗しました。",
        };
      }
      return { ok: true as const };
    } catch {
      return {
        ok: false as const,
        error: "通信エラーが発生しました。しばらくしてから再度お試しください。",
      };
    }
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
      return { ok: false as const, error: error.message };
    }
    return { ok: true as const };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        return {
          ok: false as const,
          error: data.error || "送信に失敗しました。",
        };
      }
      return { ok: true as const };
    } catch {
      return {
        ok: false as const,
        error: "通信エラーが発生しました。しばらくしてから再度お試しください。",
      };
    }
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const supabase = getSupabase();
    if (!supabase) {
      return { ok: false as const, error: "Supabase が未設定です。" };
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return { ok: false as const, error: error.message };
    }
    return { ok: true as const };
  }, []);

  const devUnauthenticated = devPersona === "unauthenticated";

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      user: devUnauthenticated ? null : (session?.user ?? null),
      session: devUnauthenticated ? null : session,
      devUnauthenticated,
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
    }),
    [
      ready,
      session,
      devUnauthenticated,
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
