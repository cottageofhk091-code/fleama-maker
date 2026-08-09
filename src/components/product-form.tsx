"use client";

import { useState, type FormEvent } from "react";
import { Wand2 } from "lucide-react";
import { CATEGORIES, CONDITIONS } from "@/lib/types";
import type { GenerateResult, ProductInput } from "@/lib/types";

type Props = {
  onGenerated: (result: GenerateResult, input: ProductInput) => void;
  onLoadingChange: (loading: boolean) => void;
  disabled?: boolean;
};

const fieldClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500";

const labelClass =
  "mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300";

export function ProductForm({ onGenerated, onLoadingChange, disabled }: Props) {
  const [category, setCategory] = useState<ProductInput["category"]>(CATEGORIES[0]);
  const [brand, setBrand] = useState("");
  const [productName, setProductName] = useState("");
  const [condition, setCondition] =
    useState<ProductInput["condition"]>(CONDITIONS[2]);
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const input: ProductInput = {
      category,
      brand: brand.trim(),
      productName: productName.trim(),
      condition,
      size: size.trim() || undefined,
      color: color.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    if (!input.brand || !input.productName) {
      setError("ブランド名と商品名は必須です。");
      return;
    }

    onLoadingChange(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "生成に失敗しました");
      }
      onGenerated(data as GenerateResult, input);
    } catch (err) {
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
          商品情報を入力
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          入力するほど、検索に強いタイトルと説明文になります
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="category" className={labelClass}>
            カテゴリ
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as ProductInput["category"])
            }
            className={fieldClass}
            required
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
            ブランド名 / メーカー名
          </label>
          <input
            id="brand"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className={fieldClass}
            placeholder="例: UNIQLO / Sony"
            required
          />
        </div>

        <div>
          <label htmlFor="productName" className={labelClass}>
            商品名・型番
          </label>
          <input
            id="productName"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            className={fieldClass}
            placeholder="例: エアリズムTシャツ / WH-1000XM5"
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="condition" className={labelClass}>
            商品の状態
          </label>
          <select
            id="condition"
            value={condition}
            onChange={(e) =>
              setCondition(e.target.value as ProductInput["condition"])
            }
            className={fieldClass}
            required
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="size" className={labelClass}>
            サイズ <span className="font-normal text-slate-400">(任意)</span>
          </label>
          <input
            id="size"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className={fieldClass}
            placeholder="例: M / 27インチ"
          />
        </div>

        <div>
          <label htmlFor="color" className={labelClass}>
            カラー <span className="font-normal text-slate-400">(任意)</span>
          </label>
          <input
            id="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className={fieldClass}
            placeholder="例: ブラック"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="notes" className={labelClass}>
            補足情報・特記事項
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`${fieldClass} min-h-[96px] resize-y`}
            placeholder="例: 1回着用、付属品完備、即日発送可能"
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={disabled}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Wand2 className="h-4 w-4" />
        出品文を一発生成
      </button>
    </form>
  );
}
