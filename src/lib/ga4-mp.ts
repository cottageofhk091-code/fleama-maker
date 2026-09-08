/**
 * GA4 Measurement Protocol (server-side).
 * Requires NEXT_PUBLIC_GA_ID (measurement ID, e.g. G-XXXX) and GA4_API_SECRET.
 */

type GA4ParamValue = string | number | boolean;

export async function sendGA4Event(
  name: string,
  params: Record<string, GA4ParamValue> = {},
): Promise<void> {
  const measurementId = process.env.NEXT_PUBLIC_GA_ID?.trim();
  const apiSecret = process.env.GA4_API_SECRET?.trim();

  if (!measurementId || !apiSecret) {
    return;
  }

  const clientId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}.${Math.floor(Math.random() * 1_000_000)}`;

  const url = new URL(
    "https://www.google-analytics.com/mp/collect",
  );
  url.searchParams.set("measurement_id", measurementId);
  url.searchParams.set("api_secret", apiSecret);

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      events: [
        {
          name,
          params: {
            engagement_time_msec: 1,
            ...params,
          },
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `GA4 MP failed: ${res.status}${body ? ` ${body.slice(0, 200)}` : ""}`,
    );
  }
}
