"use client";

import { useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { PRO_BULK_MAX_ITEMS } from "@/lib/billing";
import { authJsonHeaders } from "@/lib/auth-fetch";
import {
  rowsToDraftItems,
  validateBulkInputs,
  type BulkDraftItem,
} from "@/lib/bulk-parse";
import { CONDITION_BUTTON_LABELS } from "@/lib/condition";
import {
  formatBulkCopy,
  type SeoInsights,
} from "@/lib/seo-insights";
import {
  CATEGORIES,
  CONDITIONS,
  canSubmitProductInput,
  categoryExtraField,
  categoryExtraMeta,
  type Category,
  type Condition,
  type GenerateResult,
} from "@/lib/types";
import { SaleSpeedBadge, SeoScoreGauge } from "./seo-widgets";
import { DescriptionReviewModal } from "./description-review-modal";
import { CopyButton } from "@/components/copy-button";
import { ProRestrictedOverlay } from "@/components/billing/pro-restricted-overlay";
import { useBilling } from "@/components/billing/billing-provider";

type CardStatus = "idle" | "queued" | "running" | "done" | "error";

type BulkCard = BulkDraftItem & {
  status: CardStatus;
  progress: number;
  result?: GenerateResult;
  insights?: SeoInsights;
  error?: string;
};

type InputRow = {
  id: string;
  category: Category;
  brand: string;
  productName: string;
  modelNumber: string;
  condition: Condition;
  conditionMemo: string;
  size: string;
  operationStatus: string;
  remainingAmount: string;
};

function newRow(partial?: Partial<InputRow>): InputRow {
  return {
    id: crypto.randomUUID(),
    category: "家電・ガジェット",
    brand: "",
    productName: "",
    modelNumber: "",
    condition: "目立った傷や汚れなし",
    conditionMemo: "",
    size: "",
    operationStatus: "",
    remainingAmount: "",
    ...partial,
  };
}

const SAMPLE_ROWS: InputRow[] = [
  {
    id: "sample-1",
    category: "ファッション・古着",
    brand: "UNIQLO",
    productName: "エアリズムTシャツ",
    modelNumber: "455018",
    condition: "未使用に近い",
    conditionMemo: "美品 1回着用",
    size: "M",
    operationStatus: "",
    remainingAmount: "",
  },
  {
    id: "sample-2",
    category: "家電・ガジェット",
    brand: "Sony",
    productName: "ワイヤレスノイズキャンセリングヘッドホン",
    modelNumber: "WH-1000XM5",
    condition: "新品未使用",
    conditionMemo: "新品未使用 付属品完備",
    size: "",
    operationStatus: "動作良好",
    remainingAmount: "",
  },
  {
    id: "sample-3",
    category: "家電・ガジェット",
    brand: "アイリスオーヤマ",
    productName: "サーキュレーター",
    modelNumber: "PCF-SC15T",
    condition: "目立った傷や汚れなし",
    conditionMemo: "動作確認済み 箱なし",
    size: "",
    operationStatus: "動作良好",
    remainingAmount: "",
  },
];

export function ProBulkDashboard() {
  const {
    quota,
    openPricing,
    ensureProTrialOrPaid,
    endProTrialSession,
    applyRemainingCredits,
  } = useBilling();
  const locked = !quota.isPro;
  const [rows, setRows] = useState<InputRow[]>(SAMPLE_ROWS);
  const [cards, setCards] = useState<BulkCard[]>([]);
  const [running, setRunning] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const trialRunRef = useRef(false);
  const trialTokenRef = useRef<string | null>(null);

  const overallProgress = useMemo(() => {
    if (cards.length === 0) return 0;
    const sum = cards.reduce((acc, c) => acc + c.progress, 0);
    return Math.round(sum / cards.length);
  }, [cards]);

  const doneCount = cards.filter((c) => c.status === "done").length;
  const reviewCard = reviewIndex != null ? cards[reviewIndex] : null;

  const allRowsReady = rows.every((r) =>
    canSubmitProductInput({
      category: r.category,
      brand: r.brand,
      productName: r.productName,
      modelNumber: r.modelNumber,
      size: r.size,
      operationStatus: r.operationStatus,
      remainingAmount: r.remainingAmount,
    }),
  );

  function updateRow(id: string, patch: Partial<InputRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function addRow() {
    if (rows.length >= PRO_BULK_MAX_ITEMS) return;
    setRows((prev) => [...prev, newRow()]);
  }

  function removeRow(id: string) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }

  async function startBulk() {
    const wasTrialSession = quota.proTrialActive || quota.canUseProTrial;
    if (locked) {
      const unlocked = await ensureProTrialOrPaid();
      if (!unlocked) {
        openPricing();
        return;
      }
    }

    setFormError(null);
    const drafts = rowsToDraftItems(rows);
    const validation = validateBulkInputs(drafts);
    if (validation) {
      setFormError(validation);
      return;
    }

    const initial: BulkCard[] = drafts.map((d) => ({
      ...d,
      status: "queued",
      progress: 0,
    }));
    setCards(initial);
    setRunning(true);
    trialRunRef.current = wasTrialSession || quota.proTrialActive;
    trialTokenRef.current = null;

    const concurrency = 3;
    let cursor = 0;
    const isTrialRun = trialRunRef.current;
    const headers = await authJsonHeaders();

    async function runOne(index: number, card: BulkCard) {
      if (!card.input) return;

      setCards((prev) =>
        prev.map((c, i) =>
          i === index ? { ...c, status: "running", progress: 15 } : c,
        ),
      );

      const progressTimer = window.setInterval(() => {
        setCards((prev) =>
          prev.map((c, i) =>
            i === index && c.status === "running"
              ? { ...c, progress: Math.min(85, c.progress + 8) }
              : c,
          ),
        );
      }, 280);

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers,
          body: JSON.stringify({
            ...card.input,
            premiumFeatures: { trendSeo: true },
            includeInsights: true,
            proCopyQuality: true,
            isTrial: isTrialRun,
            ...(trialTokenRef.current
              ? { trialToken: trialTokenRef.current }
              : {}),
          }),
        });
        const data = await res.json();
        window.clearInterval(progressTimer);
        if (!res.ok) throw new Error(data.error || "生成失敗");

        if (typeof data.remainingCredits === "number") {
          applyRemainingCredits(data.remainingCredits);
        }
        if (typeof data.trialToken === "string" && data.trialToken) {
          trialTokenRef.current = data.trialToken;
        }

        const { insights, ...result } = data as GenerateResult & {
          insights: SeoInsights;
        };

        setCards((prev) =>
          prev.map((c, i) =>
            i === index
              ? {
                  ...c,
                  status: "done",
                  progress: 100,
                  result,
                  insights,
                }
              : c,
          ),
        );
      } catch (err) {
        window.clearInterval(progressTimer);
        setCards((prev) =>
          prev.map((c, i) =>
            i === index
              ? {
                  ...c,
                  status: "error",
                  progress: 100,
                  error:
                    err instanceof Error ? err.message : "生成に失敗しました",
                }
              : c,
          ),
        );
      }
    }

    // お試しは先頭1件でクレジット消費→trialToken取得後に並列
    if (isTrialRun && initial.length > 0) {
      await runOne(0, initial[0]);
      cursor = 1;
    }

    async function worker() {
      while (cursor < initial.length) {
        const index = cursor;
        cursor += 1;
        await runOne(index, initial[index]);
      }
    }

    await Promise.all(
      Array.from(
        {
          length: Math.min(
            concurrency,
            Math.max(0, initial.length - cursor),
          ),
        },
        () => worker(),
      ),
    );
    setRunning(false);
    if (trialRunRef.current) {
      endProTrialSession();
      trialRunRef.current = false;
      trialTokenRef.current = null;
    }
  }

  async function copyAll() {
    const ready = cards.filter(
      (c): c is BulkCard & { result: GenerateResult; insights: SeoInsights } =>
        Boolean(c.result && c.insights),
    );
    if (ready.length === 0) return;
    const text = formatBulkCopy(
      ready.map((c) => ({
        label:
          `${c.input?.brand ?? ""} ${c.input?.productName ?? ""} ${c.input?.modelNumber ?? ""}`.trim(),
        result: c.result,
        insights: c.insights,
      })),
    );
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    window.setTimeout(() => setCopiedAll(false), 1600);
  }

  const fieldClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
              Sold Pro 一括生成
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              3大必須入力＋コンディション詳細で、購買心理を最大化した最高品質の出品文を並列生成（最大
              {PRO_BULK_MAX_ITEMS}件）
            </p>
          </div>
          <span className="rounded-full bg-[#001F3F] px-3 py-1 text-xs font-semibold text-[#D4AF37]">
            Sold Pro
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {rows.map((row, index) => {
            const extra = categoryExtraField(row.category);
            const extraMeta = extra ? categoryExtraMeta(extra) : null;
            return (
            <div
              key={row.id}
              className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-teal-700 dark:text-teal-300">
                  #{index + 1} 3大必須＋カテゴリ必須
                </p>
                <button
                  type="button"
                  aria-label="行を削除"
                  onClick={() => removeRow(row.id)}
                  disabled={running || rows.length <= 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:bg-white hover:text-red-600 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-900"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500">
                  カテゴリー
                </label>
                <select
                  value={row.category}
                  onChange={(e) =>
                    updateRow(row.id, {
                      category: e.target.value as Category,
                    })
                  }
                  className={fieldClass}
                  disabled={running}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">
                    メーカー・ブランド（必須）
                  </label>
                  <input
                    value={row.brand}
                    onChange={(e) =>
                      updateRow(row.id, { brand: e.target.value })
                    }
                    className={fieldClass}
                    placeholder="例: アイリスオーヤマ"
                    disabled={running}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">
                    商品名（必須）
                  </label>
                  <input
                    value={row.productName}
                    onChange={(e) =>
                      updateRow(row.id, { productName: e.target.value })
                    }
                    className={fieldClass}
                    placeholder="例: サーキュレーター"
                    disabled={running}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">
                    型番・品番（必須）
                  </label>
                  <input
                    value={row.modelNumber}
                    onChange={(e) =>
                      updateRow(row.id, { modelNumber: e.target.value })
                    }
                    className={fieldClass}
                    placeholder="例: PCF-SC15T / なし"
                    disabled={running}
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    ※型番がない場合は「なし」と入力
                  </p>
                </div>
              </div>

              {extra && extraMeta && (
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">
                    {extraMeta.label}（必須）
                  </label>
                  <input
                    value={
                      extra === "size"
                        ? row.size
                        : extra === "operationStatus"
                          ? row.operationStatus
                          : row.remainingAmount
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (extra === "size") updateRow(row.id, { size: v });
                      else if (extra === "operationStatus")
                        updateRow(row.id, { operationStatus: v });
                      else updateRow(row.id, { remainingAmount: v });
                    }}
                    className={fieldClass}
                    placeholder={extraMeta.placeholder}
                    disabled={running}
                  />
                </div>
              )}

              <div>
                <p className="mb-1.5 text-[11px] font-medium text-slate-500">
                  商品の状態
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CONDITIONS.map((c) => {
                    const active = row.condition === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        disabled={running}
                        onClick={() => updateRow(row.id, { condition: c })}
                        className={`rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                          active
                            ? "border-teal-600 bg-teal-600 text-white"
                            : "border-slate-200 bg-white text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
                        }`}
                      >
                        {CONDITION_BUTTON_LABELS[c]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500">
                  コンディション詳細メモ
                </label>
                <textarea
                  value={row.conditionMemo}
                  onChange={(e) =>
                    updateRow(row.id, { conditionMemo: e.target.value })
                  }
                  className={`${fieldClass} min-h-[64px] resize-y`}
                  placeholder="動作確認・傷・付属品・発送スピードなど（箇条書き推奨）"
                  disabled={running}
                  rows={2}
                />
              </div>
            </div>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={addRow}
            disabled={running || rows.length >= PRO_BULK_MAX_ITEMS}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <Plus className="h-4 w-4" />
            行を追加
          </button>
        </div>

        {formError && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {formError}
          </p>
        )}

        {!allRowsReady && !running && (
          <p className="mt-3 text-xs text-slate-500">
            各行のメーカー・商品名・型番、およびカテゴリ別必須項目を入力すると一括生成できます
          </p>
        )}

        <button
          type="button"
          onClick={() => void startBulk()}
          disabled={running || (!locked && !allRowsReady)}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4" />
          )}
          {locked
            ? "🔒 一括生成（Pro限定）"
            : running
              ? "一括生成中…"
              : "Sold Pro品質で一括生成"}
        </button>
      </div>

      {cards.length > 0 && (
        <ProRestrictedOverlay locked={locked} minHeightClass="min-h-[320px]">
          <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  進捗 {doneCount}/{cards.length} 完了
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  購買心理最大化の説明文＋販促ブースト3パターンを並列生成
                </p>
              </div>
              <button
                type="button"
                onClick={copyAll}
                disabled={doneCount === 0}
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800 transition hover:bg-teal-100 disabled:opacity-50 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-200"
              >
                {copiedAll ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    コピー済
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    ワンクリック全件コピー
                  </>
                )}
              </button>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-teal-500 transition-all duration-300"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {cards.map((card, index) => (
              <article
                key={card.id}
                className="animate-in-fade rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/80"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-teal-700 dark:text-teal-300">
                      #{index + 1}
                    </p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">
                      {card.input
                        ? `${card.input.brand} ${card.input.productName} ${card.input.modelNumber}`
                        : `${card.brand} ${card.productName}`}
                    </h3>
                    {card.input && (
                      <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        状態: {card.input.condition}
                        {card.conditionMemo ? ` / ${card.conditionMemo}` : ""}
                      </p>
                    )}
                  </div>
                  <StatusChip status={card.status} />
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      card.status === "error" ? "bg-red-500" : "bg-[#D4AF37]"
                    }`}
                    style={{ width: `${card.progress}%` }}
                  />
                </div>

                {card.status === "running" && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <Sparkles className="h-3.5 w-3.5 animate-pulse text-[#D4AF37]" />
                    Sold Pro品質の購買心理特化文を生成中…
                  </p>
                )}

                {card.error && (
                  <p className="mt-2 text-xs text-red-600 dark:text-red-300">
                    {card.error}
                  </p>
                )}

                {card.result && card.insights && (
                  <div className="mt-3 space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <SeoScoreGauge score={card.insights.seoScore} />
                      <SaleSpeedBadge speed={card.insights.saleSpeed} />
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {card.insights.priceAdvice}
                    </p>
                    <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-500">
                          推奨タイトル
                        </p>
                        <CopyButton
                          text={card.result.titles[0]?.title ?? ""}
                          label="コピー"
                        />
                      </div>
                      <p className="text-sm text-slate-800 dark:text-slate-100">
                        {card.result.titles[0]?.title}
                      </p>
                    </div>

                    {card.result.boostPatterns?.[0] && (
                      <div className="rounded-xl border border-orange-200/70 bg-orange-50/80 p-3 dark:border-orange-900/40 dark:bg-orange-950/30">
                        <p className="text-[10px] font-bold text-orange-800 dark:text-orange-200">
                          🔥 AIおすすめブースト
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-800 dark:text-slate-100">
                          {card.result.boostPatterns.find((p) => p.recommended)
                            ?.comment ||
                            card.result.boostPatterns[0].comment}
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setReviewIndex(index)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                      <FileText className="h-4 w-4 text-teal-600" />
                      プレビュー / ブースト3選
                    </button>

                    <CopyButton
                      text={[
                        card.result.titles[0]?.title ?? "",
                        "",
                        card.result.description,
                        "",
                        card.result.hashtags.join(" "),
                      ].join("\n")}
                      label="この件をコピー"
                      size="md"
                    />
                  </div>
                )}
              </article>
            ))}
          </div>
          </div>
        </ProRestrictedOverlay>
      )}

      {locked && cards.length === 0 && (
        <ProRestrictedOverlay locked minHeightClass="min-h-[280px]">
          <div className="space-y-4 rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex flex-wrap items-center gap-4">
              <SeoScoreGauge score={86} />
              <div className="min-w-0 flex-1 space-y-2">
                <SaleSpeedBadge speed="24時間以内" />
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  SEOスコアと売却スピード予測のプレビュー（サンプル）
                </p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50"
                >
                  <p className="text-xs font-semibold text-teal-700">#{n} 一括結果</p>
                  <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                    サンプル商品タイトルがここに表示されます
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                    購買促進ブースト・SEO予測つきの説明文プレビューです。
                  </p>
                </div>
              ))}
            </div>
          </div>
        </ProRestrictedOverlay>
      )}

      <DescriptionReviewModal
        open={reviewIndex != null && Boolean(reviewCard?.result)}
        title={
          reviewCard?.input
            ? `${reviewCard.input.brand} ${reviewCard.input.productName} ${reviewCard.input.modelNumber}`
            : "商品説明"
        }
        description={reviewCard?.result?.description ?? ""}
        input={reviewCard?.input}
        result={reviewCard?.result}
        insights={reviewCard?.insights}
        onClose={() => setReviewIndex(null)}
        onSave={(next) => {
          if (reviewIndex == null) return;
          setCards((prev) =>
            prev.map((c, i) =>
              i === reviewIndex && c.result
                ? { ...c, result: { ...c.result, description: next } }
                : c,
            ),
          );
        }}
      />
    </div>
  );
}

function StatusChip({ status }: { status: CardStatus }) {
  const map: Record<CardStatus, string> = {
    idle: "待機",
    queued: "待機中",
    running: "生成中",
    done: "完了",
    error: "エラー",
  };
  const tone: Record<CardStatus, string> = {
    idle: "bg-slate-100 text-slate-600",
    queued: "bg-slate-100 text-slate-600",
    running: "bg-amber-100 text-amber-800",
    done: "bg-teal-100 text-teal-800",
    error: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone[status]}`}>
      {map[status]}
    </span>
  );
}
