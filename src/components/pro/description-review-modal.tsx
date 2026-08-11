"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, FileText, X } from "lucide-react";
import { pickRecommendedBoostId } from "@/lib/boost-patterns";
import {
  integrateSelectedBoost,
  resolveBoostPatterns,
} from "@/lib/sale-boost";
import type { BoostPatternId, GenerateResult, ProductInput } from "@/lib/types";
import type { SeoInsights } from "@/lib/seo-insights";
import { BoostPatternPicker } from "@/components/boost-pattern-picker";

type Props = {
  open: boolean;
  title: string;
  description: string;
  input?: ProductInput | null;
  result?: GenerateResult | null;
  insights?: SeoInsights | null;
  onClose: () => void;
  onSave: (next: string) => void;
};

export function DescriptionReviewModal({
  open,
  title,
  description,
  input,
  result,
  onClose,
  onSave,
}: Props) {
  if (!open) return null;

  return (
    <DescriptionReviewModalInner
      key={`${description}:${input?.modelNumber ?? ""}:${input?.productName ?? ""}`}
      title={title}
      description={description}
      input={input}
      result={result}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function DescriptionReviewModalInner({
  title,
  description,
  input,
  result,
  onClose,
  onSave,
}: Omit<Props, "open" | "insights">) {
  const patterns = useMemo(
    () => resolveBoostPatterns({ input, result }),
    [input, result],
  );
  const defaultId =
    result?.recommendedBoostId || pickRecommendedBoostId(patterns);
  const [selectedId, setSelectedId] = useState<BoostPatternId>(defaultId);

  const selectedComment =
    patterns.find((p) => p.id === selectedId)?.comment ||
    patterns.find((p) => p.recommended)?.comment ||
    "";

  const [draft, setDraft] = useState(() =>
    integrateSelectedBoost(description, selectedComment),
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setDraft(integrateSelectedBoost(description, selectedComment));
  }, [description, selectedComment]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleCopy() {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="desc-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="animate-in-fade flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300">
              <FileText className="h-3.5 w-3.5" />
              Sold Pro プレビュー / ブースト3選
            </p>
            <h2
              id="desc-modal-title"
              className="mt-1 truncate font-display text-lg font-bold text-slate-900 dark:text-white"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <section className="rounded-xl border border-orange-200/80 bg-gradient-to-br from-orange-50 to-amber-50 p-4 dark:border-orange-900/50 dark:from-orange-950/40 dark:to-amber-950/30">
            <BoostPatternPicker
              patterns={patterns}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </section>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              フル商品説明文（選択ブースト統合 / 編集可）
            </label>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={14}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 font-sans text-sm leading-7 text-slate-800 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-semibold text-teal-800 transition hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                コピー済
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                説明文をコピー
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(draft);
              onClose();
            }}
            className="inline-flex items-center rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-500"
          >
            選択内容を反映して閉じる
          </button>
          <button
            type="button"
            onClick={onClose}
            className="ml-auto inline-flex items-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
