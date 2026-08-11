import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

const FOOTER_LINKS = [
  { href: "/account", label: "契約管理・解約" },
  { href: "/terms", label: "利用規約" },
  { href: "/privacy", label: "プライバシーポリシー" },
  { href: "/tokushoho", label: "特定商取引法に基づく表記" },
  { href: "/contact", label: "お問い合わせ" },
] as const;

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200/80 bg-white/80 py-8 dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 text-center sm:px-6">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          © {year} {SITE_NAME}
        </p>
        <nav
          aria-label="法務・サポート"
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-slate-600 dark:text-slate-300"
        >
          {FOOTER_LINKS.map((link, i) => (
            <span key={link.href} className="inline-flex items-center gap-3">
              {i > 0 && (
                <span className="hidden text-slate-300 sm:inline dark:text-slate-600" aria-hidden>
                  |
                </span>
              )}
              <Link
                href={link.href}
                className="underline-offset-2 transition hover:text-teal-700 hover:underline dark:hover:text-teal-300"
              >
                {link.label}
              </Link>
            </span>
          ))}
        </nav>
      </div>
    </footer>
  );
}
