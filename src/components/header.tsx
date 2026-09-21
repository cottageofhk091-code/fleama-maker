import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { BrandMark } from "./brand-mark";
import { HeaderAuth } from "./header-auth";
import { PricingPlansButton } from "./pricing-plans-modal";
import { SITE_NAME, SITE_SHORT_NAME } from "@/lib/site";

const navLinkClass =
  "rounded-lg px-2.5 py-2 text-sm font-medium text-slate-600 transition hover:text-teal-700 dark:text-slate-300 dark:hover:text-teal-300";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f4f7f9]/85 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
        {/* 左: ロゴ */}
        <Link
          href="/"
          className="flex min-w-0 shrink-0 items-center gap-2.5 font-display text-base font-bold tracking-tight text-slate-900 dark:text-white"
        >
          <BrandMark size={32} className="shrink-0 rounded-lg shadow-sm" />
          <span className="hidden truncate sm:inline">{SITE_NAME}</span>
          <span className="sm:hidden">{SITE_SHORT_NAME}</span>
        </Link>

        {/* 中央〜右寄り: ナビリンク */}
        <nav className="ml-auto flex min-w-0 items-center gap-0.5 sm:gap-1">
          <PricingPlansButton className={navLinkClass} />
          <Link href="/account" className={`hidden sm:inline ${navLinkClass}`}>
            マイページ
          </Link>
          <Link href="/contact" className={`hidden md:inline ${navLinkClass}`}>
            お問い合わせ
          </Link>
        </nav>

        {/* 右端: 認証アクション */}
        <div className="flex shrink-0 items-center gap-2">
          <HeaderAuth />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
