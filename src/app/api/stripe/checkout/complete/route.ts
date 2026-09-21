import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { saveUserProfile } from "@/lib/analytics";
import { PROFILE_PLAN } from "@/lib/billing";
import { getStripe } from "@/lib/stripe";
import { setStripeCustomerIdForUser } from "@/lib/stripe-customer-store";
import { getOrCreateUserId } from "@/lib/user-session";

type Body = {
  sessionId?: string;
};

/**
 * After Checkout success, bind Stripe customer to the current session user
 * and return which plan/product was purchased.
 */
export async function POST(request: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY?.trim()) {
      return NextResponse.json(
        { error: "Stripeが未設定です。" },
        { status: 503 },
      );
    }

    const body = (await request.json()) as Body;
    const sessionId = (body.sessionId ?? "").trim();
    if (!sessionId.startsWith("cs_")) {
      return NextResponse.json(
        { error: "sessionId が不正です。" },
        { status: 400 },
      );
    }

    const { userId } = await getOrCreateUserId();
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.status !== "complete" && session.payment_status === "unpaid") {
      return NextResponse.json(
        { error: "決済が完了していません。" },
        { status: 400 },
      );
    }

    const ref = session.client_reference_id?.trim();
    if (ref && ref !== userId) {
      return NextResponse.json(
        { error: "セッションとログインユーザーが一致しません。" },
        { status: 403 },
      );
    }

    const customerRaw = session.customer;
    const customerId =
      typeof customerRaw === "string"
        ? customerRaw
        : customerRaw && typeof customerRaw === "object" && "id" in customerRaw
          ? String((customerRaw as { id: string }).id)
          : "";

    if (customerId && /^cus_[A-Za-z0-9]+$/.test(customerId)) {
      await setStripeCustomerIdForUser(userId, customerId);
    }

    const planType = "pro";

    await saveUserProfile({
      user_id: userId,
      plan_type: PROFILE_PLAN.paid,
    });

    return NextResponse.json({
      ok: true,
      planType,
      subscribed: true,
      customerIdHint: customerId
        ? `${customerId.slice(0, 7)}…${customerId.slice(-4)}`
        : null,
    });
  } catch (error) {
    Sentry.captureException(error);
    const message =
      error instanceof Error ? error.message : "Checkout完了処理に失敗しました。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
