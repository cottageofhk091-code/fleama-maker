"use client";

import { useState } from "react";
import { ProductForm } from "@/components/product-form";
import { ResultPanel } from "@/components/result-panel";
import { LoadingOverlay } from "@/components/loading-overlay";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import type { GenerateResult, ProductInput } from "@/lib/types";

export function HomeClient() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [lastInput, setLastInput] = useState<ProductInput | null>(null);

  return (
    <>
      {loading && <LoadingOverlay />}

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(13,148,136,0.18), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(15,118,110,0.08), transparent)",
          }}
        />
        <div className="mx-auto max-w-5xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14">
          <p className="font-display text-sm font-semibold tracking-[0.18em] text-teal-700 uppercase dark:text-teal-300">
            フリマ出品アシスタントAI
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            {SITE_NAME}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
            {SITE_TAGLINE}
          </p>
        </div>
      </section>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 pb-16 sm:px-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <ProductForm
            disabled={loading}
            onLoadingChange={setLoading}
            onGenerated={(generated, input) => {
              setResult(generated);
              setLastInput(input);
            }}
          />
          {lastInput && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              直近の生成: {lastInput.brand} / {lastInput.productName}
            </p>
          )}
        </div>
        <div className="lg:col-span-3">
          {result ? (
            <ResultPanel result={result} />
          ) : (
            <div className="flex h-full min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/40 p-8 text-center dark:border-slate-700 dark:bg-slate-900/30">
              <div>
                <p className="font-display text-base font-semibold text-slate-700 dark:text-slate-200">
                  生成結果がここに表示されます
                </p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  左のフォームから商品情報を入力して生成してください
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
