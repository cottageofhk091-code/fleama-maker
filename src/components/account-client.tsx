"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CreditCard, Settings2 } from "lucide-react";
import { CancelSubscriptionModal } from "@/components/cancel-subscription-modal";
import { SubscriptionManageButton } from "@/components/SubscriptionManageButton";
import { useBilling } from "@/components/billing/billing-provider";
import { PLAN_LABELS } from "@/lib/billing";

type SubStatus = {
  subscribed: boolean;
  status: "none" | "subscribed";
  customerIdHint: string | null;
};

export function AccountClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, quota, upgradePro, upgradePremium, buyTicketPack, setPlanForDemo } =
    useBilling();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [sub, setSub] = useState<SubStatus | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const refreshSubscription = useCallback(async () => {
    setSubLoading(true);
    try {
      const res = await fetch("/api/me/subscription");
      const data = (await res.json()) as SubStatus & { error?: string };
      if (!res.ok) throw new Error(data.error || "取得失敗");
      setSub({
        subscribed: Boolean(data.subscribed),
        status: data.subscribed ? "subscribed" : "none",
        customerIdHint: data.customerIdHint ?? null,
      });
    } catch {
      setSub({ subscribed: false, status: "none", customerIdHint: null });
    } finally {
      setSubLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSubscription();
  }, [refreshSubscription]);

  // Checkout success → bind customer id server-side, then apply local entitlement
  useEffect(() => {
    const checkout = searchParams.get("checkout");
    const sessionId = searchParams.get("session_id");
    const planHint = searchParams.get("plan");
    if (checkout !== "success" || !sessionId) return;

    let cancelled = false;
    (async () => {
      setSyncMessage("決済情報を同期しています…");
      try {
        const res = await fetch("/api/stripe/checkout/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const data = (await res.json()) as {
          error?: string;
          planType?: string;
        };
        if (!res.ok) throw new Error(data.error || "同期に失敗しました");
        if (cancelled) return;

        const planType = data.planType || planHint || "pro";
        if (planType === "premium") {
          upgradePremium();
          setSyncMessage("Sold プレミアムへの加入が完了しました。");
        } else if (planType === "ticket_10") {
          buyTicketPack();
          setSyncMessage("10回分チケットの購入が完了しました。");
        } else {
          upgradePro();
          setSyncMessage("Sold Proへの加入が完了しました。");
        }
        await refreshSubscription();
        router.replace("/account");
      } catch (err) {
        if (cancelled) return;
        setSyncMessage(
          err instanceof Error ? err.message : "決済同期に失敗しました",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    searchParams,
    upgradePro,
    upgradePremium,
    buyTicketPack,
    refreshSubscription,
    router,
  ]);

  const isPro = quota.isPro;
  const hasStripeCustomer = Boolean(sub?.subscribed);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-10 sm:px-6 sm:py-14">
      <div>
        <p className="text-xs font-semibold tracking-[0.16em] text-teal-700 uppercase dark:text-teal-300">
          マイページ
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          契約管理・解約
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          ログインセッションに紐づくStripe顧客情報をもとに、加入・管理を安全に行います。
        </p>
      </div>

      {syncMessage && (
        <p className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900 dark:border-teal-800 dark:bg-teal-950/40 dark:text-teal-200">
          {syncMessage}
        </p>
      )}

      <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500">現在のプラン</p>
            <p className="mt-1 font-display text-xl font-bold text-slate-900 dark:text-white">
              {PLAN_LABELS[quota.plan]}
            </p>
            <p className="mt-1 text-xs text-slate-500">{quota.indicatorLabel}</p>
            <p className="mt-2 text-xs text-slate-500">
              Stripe契約:{" "}
              {subLoading
                ? "確認中…"
                : hasStripeCustomer
                  ? `加入済み（${sub?.customerIdHint ?? "cus_…"}）`
                  : "SoldProプラン未加入"}
            </p>
          </div>
          {(isPro || hasStripeCustomer) && (
            <span className="rounded-full bg-[#001F3F] px-3 py-1 text-xs font-semibold text-[#D4AF37]">
              Sold Pro
            </span>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-5 text-white shadow-sm sm:p-6">
        <div className="flex items-center gap-2">
          <Settings2 className="h-5 w-5 text-slate-300" />
          <h2 className="font-display text-lg font-bold">
            SoldProプランの管理・解約
          </h2>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          {hasStripeCustomer
            ? "ご契約中のStripe顧客IDでカスタマーポータルを開きます。"
            : "まだ購入履歴がないため、加入（Checkout）へご案内します。"}
        </p>

        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
            {subLoading || !ready ? (
              <p className="text-sm text-slate-400">契約状態を確認しています…</p>
            ) : hasStripeCustomer ? (
              <SubscriptionManageButton mode="manage" />
            ) : (
              <SubscriptionManageButton
                mode="join"
                onDemoUpgrade={() => {
                  upgradePro();
                  setSyncMessage(
                    "（デモ）ローカルをProにしました。Stripe顧客IDは未紐付けです。",
                  );
                }}
              />
            )}
          </div>

          <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-4">
            <p className="text-xs font-semibold text-slate-200">
              解約申請フォーム（代替）
            </p>
            <p className="mt-1 text-xs text-slate-400">
              ポータルが使えない場合のサポート窓口です。
            </p>
            <button
              type="button"
              onClick={() => setCancelOpen(true)}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-700"
            >
              <CreditCard className="h-4 w-4" />
              解約申請フォームを開く
            </button>
          </div>
        </div>

        {isPro && (
          <button
            type="button"
            onClick={() => setPlanForDemo("free")}
            className="mt-4 w-full text-center text-xs text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
          >
            （デモ）ローカル状態を無料プランに戻す
          </button>
        )}
      </section>

      <p className="text-center text-xs text-slate-500">
        一般のお問い合わせは{" "}
        <Link href="/contact" className="text-teal-700 underline dark:text-teal-300">
          お問い合わせフォーム
        </Link>
        ／表記は{" "}
        <Link href="/tokushoho" className="text-teal-700 underline dark:text-teal-300">
          特定商取引法
        </Link>
        をご確認ください。
      </p>

      <CancelSubscriptionModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
      />
    </div>
  );
}
