import { NextResponse } from "next/server";
import type Stripe from "stripe";
import * as Sentry from "@sentry/nextjs";
import { PRICING } from "@/lib/billing";
import { getSiteOrigin, getStripe } from "@/lib/stripe";
import { getStripeCustomerIdForUser } from "@/lib/stripe-customer-store";
import { getOrCreateUserId } from "@/lib/user-session";

export type CheckoutPlanType = "pro" | "premium" | "ticket_10";

const PLAN_TYPES: CheckoutPlanType[] = ["pro", "premium", "ticket_10"];

function resolvePrice(planType: CheckoutPlanType): {
  priceId: string | undefined;
  mode: Stripe.Checkout.SessionCreateParams.Mode;
  label: string;
  priceYen: number;
} {
  switch (planType) {
    case "pro":
      return {
        priceId: sanitizePriceId(
          process.env.STRIPE_PRICE_ID_SOLD_PRO ||
            process.env.STRIPE_PRICE_ID_PRO,
        ),
        mode: "subscription",
        label: "Sold Pro",
        priceYen: PRICING.proMonthlyYen,
      };
    case "premium":
      return {
        priceId: sanitizePriceId(process.env.STRIPE_PRICE_ID_SOLD_PREMIUM),
        mode: "subscription",
        label: "Sold プレミアム",
        priceYen: PRICING.premiumMonthlyYen,
      };
    case "ticket_10":
      return {
        priceId: sanitizePriceId(process.env.STRIPE_PRICE_ID_TICKET_10),
        mode: "payment",
        label: `${PRICING.ticketPackCount}回分チケット`,
        priceYen: PRICING.ticketPackYen,
      };
  }
}

/** プレースホルダ（price_xxxxxxxx）を未設定扱いにする */
function sanitizePriceId(raw: string | undefined): string | undefined {
  const id = raw?.trim();
  if (!id) return undefined;
  if (/x{4,}/i.test(id) || id === "price_xxxxxxxx") return undefined;
  if (!/^price_[A-Za-z0-9]+$/.test(id)) return undefined;
  return id;
}

/**
 * Create Stripe Checkout Session.
 * Body: { planType: "pro" | "premium" | "ticket_10" }
 */
export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY?.trim()) {
      return NextResponse.json(
        {
          error:
            "Stripeが未設定です。STRIPE_SECRET_KEY を環境変数に設定してください。",
        },
        { status: 503 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      planType?: string;
    };
    const planType = (body.planType ?? "pro").trim() as CheckoutPlanType;
    if (!PLAN_TYPES.includes(planType)) {
      return NextResponse.json(
        { error: "planType が不正です（pro / premium / ticket_10）。" },
        { status: 400 },
      );
    }

    const plan = resolvePrice(planType);
    if (!plan.priceId) {
      const envHint =
        planType === "pro"
          ? "STRIPE_PRICE_ID_SOLD_PRO"
          : planType === "premium"
            ? "STRIPE_PRICE_ID_SOLD_PREMIUM"
            : "STRIPE_PRICE_ID_TICKET_10";
      return NextResponse.json(
        {
          error: `${plan.label}の Price ID が未設定です。${envHint} を .env.local に設定してください。`,
        },
        { status: 503 },
      );
    }

    const { userId } = await getOrCreateUserId();
    const existingCustomerId = await getStripeCustomerIdForUser(userId);
    const origin = getSiteOrigin(request);
    const stripe = getStripe();

    // Stripe Price の実額とアプリ表示価格の整合性チェック（JPY は unit_amount = 円）
    const stripePrice = await stripe.prices.retrieve(plan.priceId);
    const stripeAmount = stripePrice.unit_amount;
    if (
      stripePrice.currency !== "jpy" ||
      stripeAmount == null ||
      stripeAmount !== plan.priceYen
    ) {
      Sentry.captureMessage(
        `Stripe price mismatch: ${plan.priceId} currency=${stripePrice.currency} unit_amount=${stripeAmount} expectedYen=${plan.priceYen}`,
        "error",
      );
      return NextResponse.json(
        {
          error: `${plan.label}の Stripe 価格（${stripeAmount ?? "未設定"}円）がアプリ設定（${plan.priceYen}円）と一致しません。Stripe で月額 ${plan.priceYen}円の Price を作成し、環境変数の Price ID を更新してください。`,
        },
        { status: 503 },
      );
    }

    const successUrl = `${origin}/account?checkout=success&plan=${planType}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/account?checkout=cancel`;

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: plan.mode,
      line_items: [{ price: plan.priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      ...(existingCustomerId ? { customer: existingCustomerId } : {}),
      metadata: {
        appUserId: userId,
        planType,
        priceYen: String(plan.priceYen),
      },
      allow_promotion_codes: true,
    };

    if (plan.mode === "subscription") {
      sessionParams.subscription_data = {
        metadata: {
          appUserId: userId,
          planType,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.url) {
      return NextResponse.json(
        { error: "Checkout URLの発行に失敗しました。" },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: session.url, planType });
  } catch (error) {
    Sentry.captureException(error);
    const message =
      error instanceof Error ? error.message : "Checkoutの作成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
