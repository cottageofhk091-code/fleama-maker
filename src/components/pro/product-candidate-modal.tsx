"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, ScanSearch, X } from "lucide-react";
import type { GadgetProductCandidate } from "@/lib/gadget-models";

export type ProductCandidate = GadgetProductCandidate;

type Props = {
  open: boolean;
  modelId?: string | null;
  candidates: ProductCandidate[];
  generating?: boolean;
  heading?: string;
  description?: string;
  confirmLabel?: string;
  onSelect: (candidate: ProductCandidate) => void;
  onClose: () => void;
};

/** Candidate picker for typed model / product-name search */
export function ProductCandidateModal({
  open,
  modelId,
  candidates,
  generating = false,
  heading = "該当する商品を選択してください",
  description,
  confirmLabel = "この商品を確定",
  onSelect,
  onClose,
}: Props) {
  if (!open || candidates.length === 0) return null;

  return (
    <ProductCandidateModalInner
      key={`${modelId}:${candidates.map((c) => c.id).join(",")}`}
      modelId={modelId}
      candidates={candidates}
      generating={generating}
      heading={heading}
      description={description}
      confirmLabel={confirmLabel}
      onSelect={onSelect}
      onClose={onClose}
    />
  );
}

function ProductCandidateModalInner({
  modelId,
  candidates,
  generating,
  heading,
  description,
  confirmLabel,
  onSelect,
  onClose,
}: {
  modelId?: string | null;
  candidates: ProductCandidate[];
  generating: boolean;
  heading: string;
  description?: string;
  confirmLabel: string;
  onSelect: (candidate: ProductCandidate) => void;
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const modelLabel = modelId ? `型番 ${modelId}` : "入力テキスト";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !generating) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [generating, onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/50 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="product-candidate-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !generating) onClose();
      }}
    >
      <div className="animate-in-fade flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300">
              <ScanSearch className="h-3.5 w-3.5" />
              商品バリエーション選択
            </p>
            <h2
              id="product-candidate-title"
              className="mt-1 text-base font-semibold text-slate-900 dark:text-white"
            >
              {heading}
            </h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {description ||
                `${modelLabel} の容量・カラー・サイズなどの候補です。タップして確定してください。`}
            </p>
          </div>
          <button
            type="button"
            aria-label="閉じる"
            disabled={generating}
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {candidates.map((c) => {
            const active = selectedId === c.id;
            return (
              <button
                key={c.id}
                type="button"
                disabled={generating}
                onClick={() => setSelectedId(c.id)}
                className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-teal-500 bg-teal-50 ring-2 ring-teal-500/20 dark:bg-teal-950/40"
                    : "border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-800"
                } disabled:opacity-60`}
              >
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    active
                      ? "border-teal-600 bg-teal-600 text-white"
                      : "border-slate-300 dark:border-slate-600"
                  }`}
                >
                  {active && <Check className="h-3 w-3" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900 dark:text-white">
                    {c.name}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1.5 text-[10px] text-slate-500">
                    {c.storage && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                        {c.storage}
                      </span>
                    )}
                    {c.connectivity && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                        {c.connectivity}
                      </span>
                    )}
                    {c.color && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                        {c.color}
                      </span>
                    )}
                    {c.generation && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">
                        {c.generation}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <button
            type="button"
            disabled={!selectedId || generating}
            onClick={() => {
              const c = candidates.find((x) => x.id === selectedId);
              if (c) onSelect(c);
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                処理中…
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
