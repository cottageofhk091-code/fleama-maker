"use client";

import { useState } from "react";
import { Loader2, Search } from "lucide-react";
import type {
  GadgetProductCandidate,
  ModelLookupResult,
} from "@/lib/gadget-models";
import { estimateModelVariants, extractCodeHint } from "@/lib/model-estimate";
import { ProductCandidateModal } from "./product-candidate-modal";

type Props = {
  disabled?: boolean;
  /** Prefill from parent product field */
  defaultQuery?: string;
  onConfirmed: (payload: {
    lookup: ModelLookupResult;
    candidate: GadgetProductCandidate;
  }) => void;
  compact?: boolean;
};

function applyResult(
  result: ModelLookupResult,
  onConfirmed: Props["onConfirmed"],
  setLookup: (v: ModelLookupResult | null) => void,
  setQuery: (v: string) => void,
) {
  const safe =
    result.candidates?.length > 0
      ? result
      : estimateModelVariants(
          result.modelId || extractCodeHint(result.productBaseName),
          result.productBaseName,
        );

  if (safe.candidates.length === 1) {
    onConfirmed({ lookup: safe, candidate: safe.candidates[0] });
    setLookup(null);
    return;
  }
  setLookup(safe);
  setQuery(safe.modelId);
}

export function ModelCodeSearch({
  disabled,
  defaultQuery = "",
  onConfirmed,
  compact = false,
}: Props) {
  const [query, setQuery] = useState(defaultQuery);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [lookup, setLookup] = useState<ModelLookupResult | null>(null);

  async function runSearch() {
    if (disabled) return;
    const q = (query || defaultQuery).trim();
    if (!q) {
      setHint("型番・商品名を入力してください（例: PCF-SC15T サーキュレーター / A2588）");
      return;
    }
    setHint(null);
    setLoading(true);
    try {
      const res = await fetch("/api/model/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = (await res.json()) as ModelLookupResult & { error?: string };

      if (!res.ok || !data.candidates?.length) {
        // Never show "not found" — local estimate always succeeds
        const fallback = estimateModelVariants(extractCodeHint(q), q);
        applyResult(fallback, onConfirmed, setLookup, setQuery);
        setHint("推定モデル候補を表示しています（入力テキストから自動生成）");
        return;
      }

      applyResult(data, onConfirmed, setLookup, setQuery);
      if (data.source === "ai" || data.candidates.some((c) => c.id.startsWith("est-"))) {
        setHint(null);
      }
    } catch {
      const fallback = estimateModelVariants(extractCodeHint(q), q);
      applyResult(fallback, onConfirmed, setLookup, setQuery);
      setHint("オフライン推定候補を表示しています");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <div className="flex gap-1.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void runSearch();
            }
          }}
          disabled={disabled || loading}
          placeholder="PCF-SC15T サーキュレーター / A2588"
          aria-label="型番・商品名検索"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
        />
        <button
          type="button"
          onClick={() => void runSearch()}
          disabled={disabled || loading || !(query || defaultQuery).trim()}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#001F3F] px-2.5 py-1.5 text-[11px] font-semibold text-[#D4AF37] transition hover:opacity-90 disabled:opacity-40"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
          検索
        </button>
      </div>
      {hint && (
        <p className="text-[10px] leading-snug text-teal-700 dark:text-teal-300">
          {hint}
        </p>
      )}

      <ProductCandidateModal
        open={Boolean(lookup && lookup.candidates.length >= 2)}
        modelId={lookup?.modelId}
        candidates={lookup?.candidates ?? []}
        heading="該当する商品を選択してください"
        description={
          lookup
            ? `${lookup.brand} / ${lookup.modelId} の推定バリエーションです。タップして商品情報を確定します。`
            : undefined
        }
        confirmLabel="この商品を確定セット"
        onClose={() => setLookup(null)}
        onSelect={(candidate) => {
          if (!lookup) return;
          onConfirmed({
            lookup,
            candidate: candidate as GadgetProductCandidate,
          });
          setLookup(null);
          setQuery(lookup.modelId);
          setHint(null);
        }}
      />
    </div>
  );
}
