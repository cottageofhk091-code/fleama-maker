"use client";

import { useState } from "react";
import { Crown, ExternalLink, Loader2, Settings2 } from "lucide-react";
import { PRICING } from "@/lib/billing";

type Mode = "join" | "manage";

type Props = {
  mode: Mode;
  className?: string;
  /** Called after successful local upgrade simulation when Stripe is unavailable (optional) */
  onDemoUpgrade?: () => void;
};

export function SubscriptionManageButton({
  mode,
  className = "",
  onDemoUpgrade,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planType: "pro" }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "購入画面を開けませんでした");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "接続に失敗しました");
      setLoading(false);
    }
  }

  async function handleManage() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as {
        url?: string;
        error?: string;
        code?: string;
      };
      if (res.status === 404 && data.code === "NO_CUSTOMER") {
        // Fall through to join
        setLoading(false);
        await handleJoin();
        return;
      }
      if (!res.ok || !data.url) {
        throw new Error(data.error || "ポータルへの接続に失敗しました");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "接続に失敗しました");
      setLoading(false);
    }
  }

  if (mode === "join") {
    return (
      <div className={className}>
        <button
          type="button"
          onClick={handleJoin}
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-3.5 text-sm font-bold text-amber-100 transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              接続中...
            </>
          ) : (
            <>
              <Crown className="h-4 w-4" />
              SoldProプランに加入する（月額{" "}
              {PRICING.proMonthlyYen.toLocaleString("ja-JP")}円）
            </>
          )}
        </button>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
          ※未加入のため契約管理ポータルは利用できません。Checkoutへ進みます。
        </p>
        {onDemoUpgrade && (
          <button
            type="button"
            onClick={onDemoUpgrade}
            className="mt-2 w-full text-center text-[11px] text-slate-500 underline-offset-2 hover:underline"
          >
            （デモ）StripeなしでPro状態にする
          </button>
        )}
        {error && (
          <p className="mt-2 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs text-red-200">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleManage}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3.5 text-sm font-semibold text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            接続中...
          </>
        ) : (
          <>
            <Settings2 className="h-4 w-4" />
            ⚙️ SoldProプランの管理・解約
          </>
        )}
      </button>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
        ※プランの解約、カード情報の変更、請求履歴の確認が可能です
      </p>
      {error && (
        <p className="mt-2 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      )}
      <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-500">
        <ExternalLink className="h-3 w-3" />
        Stripeカスタマーポータル（ログインユーザー固有の顧客IDで開きます）
      </p>
    </div>
  );
}
