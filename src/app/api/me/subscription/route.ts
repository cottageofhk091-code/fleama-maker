import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getStripeCustomerIdForUser } from "@/lib/stripe-customer-store";
import { getOrCreateUserId } from "@/lib/user-session";

/**
 * Returns subscription linkage for the current browser session user.
 * Does not expose raw customer id to the client (only a boolean + masked hint).
 */
export async function GET() {
  try {
    const { userId } = await getOrCreateUserId();
    const stripeCustomerId = await getStripeCustomerIdForUser(userId);
    const subscribed = Boolean(stripeCustomerId);

    return NextResponse.json({
      userId,
      subscribed,
      status: subscribed ? "subscribed" : "none",
      /** Masked for UI debug only — never send full id to client for portal auth */
      customerIdHint: stripeCustomerId
        ? `${stripeCustomerId.slice(0, 7)}…${stripeCustomerId.slice(-4)}`
        : null,
    });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      { error: "セッション情報の取得に失敗しました。" },
      { status: 500 },
    );
  }
}
