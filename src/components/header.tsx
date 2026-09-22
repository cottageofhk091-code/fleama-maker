"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { LogIn, LogOut, UserPlus } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { BrandMark } from "./brand-mark";
import { HeaderAuthModal } from "./header-auth";
import { PricingPlansButton } from "./pricing-plans-modal";
import { useAuth } from "@/components/auth-provider";
import { getSupabase } from "@/lib/supabase";
import { SITE_NAME, SITE_SHORT_NAME } from "@/lib/site";

const navLinkClass =
  "rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 transition hover:text-teal-700 dark:text-slate-300 dark:hover:text-teal-300";
const outlineBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 sm:text-sm";
const solidBtn =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-500 sm:text-sm";
const subBtn =
  "inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700";

export function Header() {
  const router = useRouter();
  const { ready, user: authUser, signOut, devUnauthenticated } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [modalMode, setModalMode] = useState<"login" | "signup" | null>(null);

  // Header 内で onAuthStateChange を監視し、表示をリアルタイム切替
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setAuthReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const effectiveUser = devUnauthenticated ? null : (user ?? authUser);
  const showAuth = authReady && ready;

  async function handleSignOut() {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    } else {
      await signOut();
    }
    router.replace("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f4f7f9]/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center gap-2.5 font-display text-base font-bold tracking-tight text-slate-900 dark:text-white"
        >
          <BrandMark size={32} className="shrink-0 rounded-lg shadow-sm" />
          <span className="hidden truncate sm:inline">{SITE_NAME}</span>
          <span className="sm:hidden">{SITE_SHORT_NAME}</span>
        </Link>

        <nav className="ml-auto flex min-w-0 items-center gap-0.5 sm:gap-1">
          <PricingPlansButton className={navLinkClass} />
          <Link href="/account" className={`hidden sm:inline ${navLinkClass}`}>
            マイページ
          </Link>
          <Link href="/contact" className={`hidden md:inline ${navLinkClass}`}>
            お問い合わせ
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {!showAuth ? (
            <div className="h-9 w-36 animate-pulse rounded-lg bg-slate-200/70 dark:bg-slate-800/70" />
          ) : effectiveUser ? (
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className={subBtn}
            >
              <LogOut className="h-3.5 w-3.5" />
              ログアウト
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModalMode("login")}
                className={outlineBtn}
              >
                <LogIn className="h-3.5 w-3.5" />
                ログイン
              </button>
              <button
                type="button"
                onClick={() => setModalMode("signup")}
                className={solidBtn}
              >
                <UserPlus className="h-3.5 w-3.5" />
                新規登録
              </button>
            </div>
          )}
          <ThemeToggle />
        </div>
      </div>

      <HeaderAuthModal
        mode={modalMode}
        onClose={() => setModalMode(null)}
        onModeChange={setModalMode}
      />
    </header>
  );
}
