import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getSiteOrigin, getStripe } from "@/lib/stripe";
import { getStripeCustomerIdForUser } from "@/lib/stripe-customer-store";
import { getOrCreateUserId } from "@/lib/user-session";

/**
 * Create a Stripe Billing Customer Portal session for the current user.
 * Customer ID is resolved server-side from the signed session — never trust client body.
 */
export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY?.trim()) {
      return NextResponse.json(
        {
          error:
            "Stripeが未設定です。STRIPE_SECRET_KEY を環境変数に設定してください。",
          code: "STRIPE_NOT_CONFIGURED",
        },
        { status: 503 },
      );
    }

    const { userId } = await getOrCreateUserId();
    const stripeCustomerId = await getStripeCustomerIdForUser(userId);

    if (!stripeCustomerId) {
      return NextResponse.json(
        {
          error: "SoldProプラン未加入のため、契約管理ポータルを開けません。",
          code: "NO_CUSTOMER",
        },
        { status: 404 },
      );
    }

    // Verify customer still exists in Stripe
    const stripe = getStripe();
    try {
      await stripe.customers.retrieve(stripeCustomerId);
    } catch {
      return NextResponse.json(
        {
          error:
            "Stripe上に顧客が見つかりません。再度SoldProに加入してください。",
          code: "CUSTOMER_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    const origin = getSiteOrigin(request);
    const returnUrl = `${origin}/settings`;

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "ポータルURLの発行に失敗しました。" },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    Sentry.captureException(error);
    const message =
      error instanceof Error ? error.message : "ポータルの作成に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
