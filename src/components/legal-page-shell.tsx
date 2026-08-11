import Link from "next/link";
import type { ReactNode } from "react";
import { LEGAL } from "@/lib/site";

type Props = {
  title: string;
  children: ReactNode;
};

export function LegalPageShell({ title, children }: Props) {
  return (
    <div className="bg-slate-950 text-slate-200">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-xs font-semibold tracking-[0.16em] text-teal-400 uppercase">
          {LEGAL.serviceName}
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          最終更新日: {LEGAL.lastUpdated}
        </p>
        <div className="prose-legal mt-10 space-y-8 text-[15px] leading-7 text-slate-300">
          {children}
        </div>
        <p className="mt-12 text-sm text-slate-500">
          <Link href="/" className="text-teal-400 underline-offset-2 hover:underline">
            ← トップへ戻る
          </Link>
        </p>
      </div>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-xl font-bold tracking-tight text-white">
        {title}
      </h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
