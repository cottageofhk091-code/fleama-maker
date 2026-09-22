"use client";

import { useState } from "react";
import { Bookmark, Layers, PenLine } from "lucide-react";
import { ProductForm } from "@/components/product-form";
import { ResultPanel } from "@/components/result-panel";
import { LoadingOverlay } from "@/components/loading-overlay";
import { PaywallModal } from "@/components/billing/paywall-modal";
import { ProRestrictedOverlay } from "@/components/billing/pro-restricted-overlay";
import { useBilling } from "@/components/billing/billing-provider";
import { ProBulkDashboard } from "@/components/pro/pro-bulk-dashboard";
import { SaleSpeedBadge, SeoScoreGauge } from "@/components/pro/seo-widgets";
import { computeSeoInsights } from "@/lib/seo-insights";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import type { GenerateResult, ProductInput } from "@/lib/types";

type MainTab = "single" | "pro";

export function HomeClient() {
  const { trySaveTemplate, openPaywall, quota } = useBilling();
  const [tab, setTab] = useState<MainTab>("single");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [lastInput, setLastInput] = useState<ProductInput | null>(null);
  const [templateMessage, setTemplateMessage] = useState<string | null>(null);

  const singleInsights =
    result && lastInput ? computeSeoInsights(lastInput, result) : null;

  function handleSaveTemplate() {
    if (!result || !lastInput) return;
    const saved = trySaveTemplate(
      `${lastInput.brand} ${lastInput.productName}`.slice(0, 40),
      { input: lastInput, result },
    );
    if (!saved.ok) {
      setTemplateMessage("テンプレート保存上限です。Proプランで無制限に。");
      openPaywall();
      return;
    }
    setTemplateMessage("テンプレートを保存しました");
    window.setTimeout(() => setTemplateMessage(null), 2000);
  }

  return (
    <>
      {loading && <LoadingOverlay />}
      <PaywallModal />

      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(13,148,136,0.18), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(15,118,110,0.08), transparent)",
          }}
        />
        <div className="mx-auto max-w-5xl px-4 pb-6 pt-10 sm:px-6 sm:pt-14">
          <p className="font-display text-sm font-semibold tracking-[0.18em] text-teal-700 uppercase dark:text-teal-300">
            修正不要・即コピペ
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl dark:text-white">
            {SITE_NAME}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-300">
            {SITE_TAGLINE}
          </p>
          <ol className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            <li>① 型番・状態を正確に入力</li>
            <li>② 一発生成</li>
            <li>③ ワンタップでコピペ出品</li>
          </ol>

          <div className="mt-6 inline-flex rounded-xl border border-slate-200 bg-white/80 p-1 dark:border-slate-700 dark:bg-slate-900/80">
            <button
              type="button"
              onClick={() => setTab("single")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                tab === "single"
                  ? "bg-teal-600 text-white"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <PenLine className="h-4 w-4" />
              単品生成
            </button>
            <button
              type="button"
              onClick={() => setTab("pro")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition ${
                tab === "pro"
                  ? "bg-[#001F3F] text-[#D4AF37]"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              <Layers className="h-4 w-4" />
              🔒 Proプラン（一括・SEO表示）
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
        {tab === "pro" ? (
          <ProBulkDashboard />
        ) : (
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="space-y-4 lg:col-span-2">
              <ProductForm
                disabled={loading}
                onLoadingChange={setLoading}
                onGenerated={(generated, input) => {
                  setResult(generated);
                  setLastInput(input);
                  setTemplateMessage(null);
                }}
              />
              {lastInput && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  確定情報: {lastInput.brand} / {lastInput.productName} /{" "}
                  {lastInput.modelNumber}
                </p>
              )}
            </div>
            <div className="lg:col-span-3">
              {result ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    {quota.isPremium && (
                      <span className="rounded-full bg-[#001F3F] px-3 py-1 text-xs font-medium text-[#D4AF37]">
                        トレンドSEO適用済み
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={handleSaveTemplate}
                      disabled={
                        !quota.canSaveTemplate && !quota.isPremium
                      }
                      className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <Bookmark className="h-3.5 w-3.5" />
                      テンプレート保存
                      {quota.plan === "free" && quota.templateLimit != null
                        ? `（${quota.templateCount}/${quota.templateLimit}）`
                        : ""}
                    </button>
                  </div>

                  {result && (
                    <ProRestrictedOverlay
                      locked={!quota.isPro}
                      className="rounded-2xl border border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/80"
                      minHeightClass="min-h-[160px]"
                    >
                      {quota.isPro && singleInsights ? (
                        <div className="flex flex-wrap items-center gap-4 p-4">
                          <SeoScoreGauge score={singleInsights.seoScore} />
                          <div className="min-w-0 flex-1 space-y-2">
                            <SaleSpeedBadge speed={singleInsights.saleSpeed} />
                            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                              {singleInsights.priceAdvice}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="flex flex-wrap items-center gap-4 p-4"
                          aria-hidden
                        >
                          <SeoScoreGauge score={86} />
                          <div className="min-w-0 flex-1 space-y-2">
                            <SaleSpeedBadge speed="24時間以内" />
                            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                              SEOスコアと売却スピード予測のサンプル表示です。
                            </p>
                          </div>
                        </div>
                      )}
                    </ProRestrictedOverlay>
                  )}

                  {templateMessage && (
                    <p className="text-xs text-teal-700 dark:text-teal-300">
                      {templateMessage}
                    </p>
                  )}
                  <ResultPanel
                    key={`${lastInput?.brand}-${lastInput?.modelNumber}-${result.titles[0]?.title}`}
                    result={result}
                  />
                </div>
              ) : (
                <div className="flex h-full min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/40 p-8 text-center dark:border-slate-700 dark:bg-slate-900/30">
                  <div>
                    <p className="font-display text-base font-semibold text-slate-700 dark:text-slate-200">
                      完成した出品文がここに表示されます
                    </p>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                      左で正確に入力 → 生成後、タイトル／説明文をワンタップでコピー
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
