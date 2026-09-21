"use client";

import { useMemo, useState } from "react";
import { FileText, Hash, Type } from "lucide-react";
import type { BoostPatternId, GenerateResult } from "@/lib/types";
import { pickRecommendedBoostId } from "@/lib/boost-patterns";
import { BoostPatternPicker } from "@/components/boost-pattern-picker";
import { ProRestrictedOverlay } from "@/components/billing/pro-restricted-overlay";
import { useBilling } from "@/components/billing/billing-provider";
import { CopyButton } from "./copy-button";

type Props = {
  result: GenerateResult;
};

function buildFullDescription(
  result: GenerateResult,
  selectedBoost: string,
  includeBoost: boolean,
): string {
  const parts = [
    result.description.trim(),
    includeBoost && selectedBoost
      ? `\n\n【🔥 購買促進ブースト】\n・${selectedBoost}`
      : "",
    result.hashtags.length ? `\n\n${result.hashtags.join(" ")}` : "",
  ];
  return parts.join("").trim();
}

export function ResultPanel({ result }: Props) {
  const { quota } = useBilling();
  const isPro = quota.isPro;

  const brand = result.identifiedBrand?.trim() || "";
  const product = result.identifiedProduct || result.titles[0]?.title || "商品";
  const primaryTitle = result.titles[0]?.title ?? "";
  const patterns = result.boostPatterns ?? [];

  const defaultId: BoostPatternId =
    result.recommendedBoostId ||
    pickRecommendedBoostId(patterns) ||
    "value";

  const [selectedId, setSelectedId] = useState<BoostPatternId>(defaultId);

  const selectedComment = useMemo(() => {
    const hit = patterns.find((p) => p.id === selectedId);
    return hit?.comment || patterns.find((p) => p.recommended)?.comment || "";
  }, [patterns, selectedId]);

  const fullDescription = buildFullDescription(
    result,
    selectedComment,
    isPro,
  );

  return (
    <section className="space-y-4 animate-in-fade">
      <div className="rounded-2xl border border-teal-200/80 bg-gradient-to-br from-teal-50 to-white px-4 py-3 dark:border-teal-900 dark:from-teal-950/50 dark:to-slate-900">
        <p className="text-sm font-semibold text-teal-900 dark:text-teal-100">
          タイトル・説明文はすぐにコピペできます
        </p>
        <p className="mt-0.5 text-xs text-teal-800/80 dark:text-teal-200/80">
          {isPro
            ? "販促ブースト3選からおすすめを選んで本文へ統合できます"
            : "販促ブースト3選は Sold Pro で解放できます"}
        </p>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/60">
        <span className="text-xs font-medium text-slate-500">確定情報</span>
        <p className="mt-0.5 font-semibold text-slate-900 dark:text-white">
          {brand}
          <span className="mx-1.5 font-normal text-slate-400">/</span>
          {product}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Type className="h-5 w-5 text-teal-600" />
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              タイトル
            </h2>
          </div>
          <CopyButton
            text={primaryTitle}
            label="ワンタップでコピー"
            size="md"
            emphasis
          />
        </div>

        <div className="rounded-xl border border-teal-200 bg-teal-50/80 p-4 dark:border-teal-800 dark:bg-teal-950/40">
          <p className="text-sm font-medium leading-relaxed text-slate-900 dark:text-slate-50">
            {primaryTitle}
          </p>
        </div>

        {result.titles.length > 1 && (
          <ul className="mt-3 space-y-2">
            {result.titles.slice(1).map((item, index) => (
              <li
                key={`${item.type}-${index}`}
                className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/50"
              >
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold tracking-wide text-slate-500">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                    {item.title}
                  </p>
                </div>
                <CopyButton text={item.title} label="コピー" />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 商品説明（ブーストなしでもコピペ可） */}
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-teal-600" />
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              商品説明文
            </h2>
          </div>
          <CopyButton
            text={
              isPro
                ? fullDescription
                : [result.description.trim(), "", result.hashtags.join(" ")]
                    .join("\n")
                    .trim()
            }
            label="ワンタップでコピー"
            size="md"
            emphasis
          />
        </div>
        <pre className="max-h-[360px] overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50/80 p-4 font-sans text-sm leading-7 text-slate-800 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-100">
          {result.description}
        </pre>
      </div>

      {/* 販促ブースト — Proのみフル解放（無料はモザイク・実データ非表示） */}
      {(patterns.length > 0 || !isPro) && (
        <ProRestrictedOverlay
          locked={!isPro}
          className="rounded-2xl border border-orange-200/80 bg-gradient-to-br from-orange-50 to-amber-50 shadow-sm dark:border-orange-900/50 dark:from-orange-950/40 dark:to-amber-950/30"
          minHeightClass="min-h-[240px]"
        >
          <div className="p-5 sm:p-6">
            {isPro ? (
              <>
                <BoostPatternPicker
                  patterns={patterns}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
                <div className="mt-3 flex justify-end">
                  <CopyButton
                    text={selectedComment}
                    label="選択中ブーストをコピー"
                    size="md"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-3" aria-hidden>
                <h3 className="font-display text-base font-semibold">
                  販促ブースト文（3パターン）
                </h3>
                {["価値訴求サンプル文面です", "スピード訴求サンプル文面です", "信頼訴求サンプル文面です"].map(
                  (text) => (
                    <div
                      key={text}
                      className="rounded-xl border border-slate-200 bg-white p-3.5 text-sm dark:border-slate-700 dark:bg-slate-950"
                    >
                      {text}
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </ProRestrictedOverlay>
      )}

      {result.hashtags.length > 0 && (
        <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-teal-600" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                ハッシュタグのみ
              </h3>
            </div>
            <CopyButton
              text={result.hashtags.join(" ")}
              label="ワンタップでコピー"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {result.hashtags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
