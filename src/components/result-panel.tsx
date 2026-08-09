"use client";

import { Hash, FileText, Type } from "lucide-react";
import type { GenerateResult } from "@/lib/types";
import { CopyButton } from "./copy-button";

type Props = {
  result: GenerateResult;
};

export function ResultPanel({ result }: Props) {
  return (
    <section className="space-y-5 animate-in-fade">
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Type className="h-5 w-5 text-teal-600" />
          <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
            SEO最適化タイトル（3パターン）
          </h2>
        </div>
        <ul className="space-y-3">
          {result.titles.map((item) => (
            <li
              key={item.type}
              className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-950/50"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <span className="text-xs font-semibold tracking-wide text-teal-700 dark:text-teal-300">
                  {item.label}
                </span>
                <CopyButton text={item.title} label="1クリックコピー" />
              </div>
              <p className="text-sm leading-relaxed text-slate-800 dark:text-slate-100">
                {item.title}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-600" />
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              商品説明文
            </h2>
          </div>
          <CopyButton text={result.description} label="全体コピー" size="md" />
        </div>
        <pre className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50/80 p-4 font-sans text-sm leading-7 text-slate-800 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100">
          {result.description}
        </pre>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-teal-600" />
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              おすすめハッシュタグ
            </h2>
          </div>
          <CopyButton
            text={result.hashtags.join(" ")}
            label="一括コピー"
            size="md"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {result.hashtags.map((tag) => (
            <div
              key={tag}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-1.5 dark:border-slate-700 dark:bg-slate-950/60"
            >
              <span className="text-sm text-slate-700 dark:text-slate-200">
                {tag}
              </span>
              <CopyButton text={tag} label="コピー" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
