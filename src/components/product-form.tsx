"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Wand2 } from "lucide-react";
import {
  CATEGORIES,
  CONDITIONS,
  canSubmitProductInput,
  categoryExtraField,
  categoryExtraMeta,
} from "@/lib/types";
import type { GenerateResult, ProductInput } from "@/lib/types";
import { CONDITION_BUTTON_LABELS } from "@/lib/condition";
import { authJsonHeaders } from "@/lib/auth-fetch";
import { useBilling } from "@/components/billing/billing-provider";

type Props = {
  onGenerated: (result: GenerateResult, input: ProductInput) => void;
  onLoadingChange: (loading: boolean) => void;
  disabled?: boolean;
};

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500";

const labelClass =
  "mb-1.5 block text-sm font-semibold text-slate-800 dark:text-slate-200";

function StepBadge({ n }: { n: number }) {
  return (
    <span className="mr-2 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-600 text-[11px] font-bold text-white">
      {n}
    </span>
  );
}

function RequiredMark() {
  return (
    <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
      必須
    </span>
  );
}

export function ProductForm({ onGenerated, onLoadingChange, disabled }: Props) {
  const {
    reserveGeneration,
    rollbackReservation,
    openPaywall,
    quota,
    applyRemainingCredits,
    endProTrialSession,
  } = useBilling();
  const [category, setCategory] = useState<ProductInput["category"]>(
    "家電・ガジェット",
  );
  const [brand, setBrand] = useState("");
  const [productName, setProductName] = useState("");
  const [modelNumber, setModelNumber] = useState("");
  const [size, setSize] = useState("");
  const [operationStatus, setOperationStatus] = useState("");
  const [remainingAmount, setRemainingAmount] = useState("");
  const [condition, setCondition] =
    useState<ProductInput["condition"]>(CONDITIONS[2]);
  const [conditionMemo, setConditionMemo] = useState("");
  const [error, setError] = useState<string | null>(null);

  const extraField = categoryExtraField(category);
  const extraMeta = extraField ? categoryExtraMeta(extraField) : null;

  const draft = useMemo(
    () => ({
      category,
      brand,
      productName,
      modelNumber,
      size,
      operationStatus,
      remainingAmount,
    }),
    [
      category,
      brand,
      productName,
      modelNumber,
      size,
      operationStatus,
      remainingAmount,
    ],
  );

  const canGenerate = useMemo(
    () => canSubmitProductInput(draft) && !disabled && quota.canGenerate,
    [draft, disabled, quota.canGenerate],
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!canSubmitProductInput(draft)) {
      setError(
        "メーカー・商品名・型番、およびカテゴリ別の必須項目をすべて入力してください。",
      );
      return;
    }

    const appeal = conditionMemo.trim();
    const input: ProductInput = {
      category,
      brand: brand.trim(),
      productName: productName.trim(),
      modelNumber: modelNumber.trim(),
      condition,
      conditionMemo: appeal || undefined,
      notes: appeal || undefined,
      size: size.trim() || undefined,
      operationStatus: operationStatus.trim() || undefined,
      remainingAmount: remainingAmount.trim() || undefined,
    };

    const reservation = reserveGeneration();
    if (!reservation.ok) {
      return;
    }

    onLoadingChange(true);
    try {
      const body = {
        ...input,
        ...(quota.isPremium
          ? { premiumFeatures: { trendSeo: true } }
          : {}),
        ...(quota.isPro
          ? {
              includeInsights: true,
              proCopyQuality: true,
              isTrial: quota.proTrialActive || quota.canUseProTrial,
            }
          : {}),
      };

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: await authJsonHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "生成に失敗しました");
      }
      if (typeof data.remainingCredits === "number") {
        applyRemainingCredits(data.remainingCredits);
        if (data.remainingCredits <= 0 && quota.proTrialActive) {
          endProTrialSession();
        }
      }
      const resolvedInput =
        (data.resolvedInput as ProductInput | undefined) || input;
      onGenerated(data as GenerateResult, resolvedInput);
    } catch (err) {
      rollbackReservation(reservation.source);
      setError(err instanceof Error ? err.message : "生成に失敗しました");
    } finally {
      onLoadingChange(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 sm:p-6"
    >
      <div className="mb-5">
        <h2 className="font-display text-lg font-semibold text-slate-900 dark:text-white">
          確実な情報入力
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          カテゴリに応じた必須項目を埋めるほど、修正不要の完成文になります
        </p>
      </div>

      <div className="space-y-5">
        <div>
          <label htmlFor="category" className={labelClass}>
            カテゴリー
            <RequiredMark />
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as ProductInput["category"])
            }
            className={fieldClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="brand" className={labelClass}>
            <StepBadge n={1} />
            メーカー・ブランド
            <RequiredMark />
          </label>
          <input
            id="brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className={fieldClass}
            placeholder="例: アイリスオーヤマ、Apple、SONY"
            required
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor="productName" className={labelClass}>
            <StepBadge n={2} />
            商品名
            <RequiredMark />
          </label>
          <input
            id="productName"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className={fieldClass}
            placeholder="例: サーキュレーター、iPad Air 第5世代"
            required
            autoComplete="off"
          />
        </div>

        <div>
          <label htmlFor="modelNumber" className={labelClass}>
            <StepBadge n={3} />
            型番・品番
            <RequiredMark />
          </label>
          <input
            id="modelNumber"
            value={modelNumber}
            onChange={(e) => setModelNumber(e.target.value)}
            className={fieldClass}
            placeholder="例: AZ-SDC15T、A2588"
            required
            autoComplete="off"
          />
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
            ※型番がない場合は「なし」と入力（特徴・実用メリット特化の文章に切り替えます）
          </p>
        </div>

        {extraField && extraMeta && (
          <div className="animate-in-fade rounded-xl border border-teal-200/70 bg-teal-50/50 p-3.5 dark:border-teal-900 dark:bg-teal-950/30">
            <label htmlFor="categoryExtra" className={labelClass}>
              {extraMeta.label}
              <RequiredMark />
            </label>
            <input
              id="categoryExtra"
              value={
                extraField === "size"
                  ? size
                  : extraField === "operationStatus"
                    ? operationStatus
                    : remainingAmount
              }
              onChange={(e) => {
                const v = e.target.value;
                if (extraField === "size") setSize(v);
                else if (extraField === "operationStatus") setOperationStatus(v);
                else setRemainingAmount(v);
              }}
              className={fieldClass}
              placeholder={extraMeta.placeholder}
              required
              autoComplete="off"
            />
            <p className="mt-1.5 text-[11px] text-teal-800/80 dark:text-teal-200/80">
              {extraMeta.hint}
            </p>
          </div>
        )}

        <div>
          <p className={labelClass}>商品の状態</p>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="商品の状態"
          >
            {CONDITIONS.map((c) => {
              const active = condition === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCondition(c)}
                  className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition sm:text-[13px] ${
                    active
                      ? "border-teal-600 bg-teal-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-teal-400 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-200"
                  }`}
                >
                  {CONDITION_BUTTON_LABELS[c]}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor="conditionMemo" className={labelClass}>
            コンディション・アピール詳細
            <span className="ml-2 text-xs font-normal text-slate-400">
              箇条書き推奨
            </span>
          </label>
          <textarea
            id="conditionMemo"
            value={conditionMemo}
            onChange={(e) => setConditionMemo(e.target.value)}
            className={`${fieldClass} min-h-[120px] resize-y`}
            placeholder={
              "例:\n・動作良好\n・液晶に目立たない薄いスレ傷あり\n・箱・説明書付き\n・24時間以内発送"
            }
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {!quota.canGenerate && (
        <button
          type="button"
          onClick={openPaywall}
          className="mt-4 w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-left text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          生成枠がありません。プランまたはチケットを確認してください →
        </button>
      )}

      {!canGenerate && quota.canGenerate && (
        <p className="mt-4 text-xs text-slate-500">
          必須項目をすべて入力すると生成できます
          {extraMeta ? `（${extraMeta.label}を含む）` : ""}
        </p>
      )}

      <button
        type="submit"
        disabled={!canGenerate}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Wand2 className="h-4 w-4" />
        {quota.isPro
          ? "Sold Pro品質で出品文を一発生成"
          : "修正不要の出品文を一発生成"}
      </button>
    </form>
  );
}
