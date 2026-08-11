export type CheckoutPlanType = "pro" | "premium" | "ticket_10";

export async function startCheckoutSession(
  planType: CheckoutPlanType,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planType }),
    });
    const data = (await res.json()) as { url?: string; error?: string };
    if (!res.ok || !data.url) {
      return {
        ok: false,
        error: data.error || "決済ページを開けませんでした",
      };
    }
    return { ok: true, url: data.url };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "通信エラーが発生しました",
    };
  }
}
