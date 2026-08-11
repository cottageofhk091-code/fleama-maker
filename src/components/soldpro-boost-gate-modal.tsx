"use client";

import { useEffect } from "react";
import { Crown, Sparkles, X } from "lucide-react";
import { PRICING } from "@/lib/billing";
import { useBilling } from "@/components/billing/billing-provider";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function SoldProBoostGateModal({ open, onClose }: Props) {
  const { upgradePro, openPaywall } = useBilling();

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="soldpro-gate-title"
    >
      <button
        type="button"
        aria-label="背景をタップして閉じる"
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={onClose}
      />

      <div className="relative z-10 flex w-full max-w-lg max-h-[min(90vh,640px)] flex-col overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-slate-900 to-slate-950 text-white shadow-2xl shadow-amber-500/10">
        <div className="relative shrink-0 border-b border-amber-500/20 px-5 pb-4 pt-5 sm:px-7 sm:pt-6">
          <button
            type="button"
            aria-label="閉じる"
            onClick={onClose}
            className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-300 transition hover:border-amber-500/40 hover:bg-white/10 hover:text-white sm:right-4 sm:top-4"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="pr-12">
            <p className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              Sold Pro 限定
            </p>
            <h2
              id="soldpro-gate-title"
              className="mt-3 font-display text-xl font-bold leading-snug tracking-tight text-white sm:text-2xl"
            >
              売却ブースト文を解放する
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              コスパ／スピード／実用安心の3パターン提案と「🔥
              SEOおすすめ！」バッジ付き選択は、Sold Pro
              プラン限定機能です。
            </p>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          <ul className="space-y-2.5 text-sm text-slate-200">
            <li className="flex gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
              <span className="text-amber-400">▸</span>
              <span>成約率を押し上げる販促ブースト3選をワンタップ選択</span>
            </li>
            <li className="flex gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
              <span className="text-amber-400">▸</span>
              <span>AIが付与する「🔥 SEOおすすめ！」で迷わず本文へ統合</span>
            </li>
            <li className="flex gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
              <span className="text-amber-400">▸</span>
              <span>一括生成・SEO売却予測など Pro 出品フローも解放</span>
            </li>
          </ul>

          <div className="mt-6 flex flex-col items-center">
            <button
              type="button"
              onClick={() => {
                onClose();
                upgradePro();
              }}
              className="soldpro-cta-glow inline-flex w-full max-w-md items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 px-5 py-4 text-center text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-amber-500/40 sm:text-base"
            >
              <Crown className="h-5 w-5 shrink-0" />
              <span className="leading-snug">
                今すぐSoldProにアップグレードして解放
              </span>
            </button>
            <p className="mt-2 text-center text-xs text-slate-400">
              月額 {PRICING.proMonthlyYen.toLocaleString("ja-JP")}円（デモでは即時切替）
            </p>
          </div>
        </div>

        <div className="shrink-0 border-t border-white/10 px-5 py-4 sm:px-7">
          <button
            type="button"
            onClick={() => {
              onClose();
              openPaywall();
            }}
            className="w-full rounded-xl border border-white/15 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-amber-500/30 hover:bg-white/5 hover:text-white"
          >
            プラン一覧を見る
          </button>
        </div>
      </div>
    </div>
  );
}
