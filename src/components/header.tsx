import Link from "next/link";
import { Sparkles } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f4f7f9]/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-display text-base font-bold tracking-tight text-slate-900 dark:text-white">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">フリマ一発売却メーカー</span>
          <span className="sm:hidden">一発売却</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/contact"
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            お問い合わせ
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
