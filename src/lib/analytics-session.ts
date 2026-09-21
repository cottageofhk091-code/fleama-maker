const SESSION_KEY = "furima_sold_analytics_session_id";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}.${Math.floor(Math.random() * 1_000_000)}`;
}

/** タブ単位の session_id（sessionStorage） */
export function getOrCreateAnalyticsSessionId(): string {
  if (typeof window === "undefined") return createId();
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const next = createId();
    sessionStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return createId();
  }
}

/**
 * サーバーの fleama_uid と揃えるため /api/me/subscription から userId を取得。
 * 失敗時は一時 ID を返す。
 */
export async function resolveAnalyticsUserId(): Promise<string> {
  try {
    const res = await fetch("/api/me/subscription", { method: "GET" });
    if (!res.ok) return createId();
    const data = (await res.json()) as { userId?: string };
    if (typeof data.userId === "string" && data.userId.trim()) {
      return data.userId.trim();
    }
  } catch {
    // fall through
  }
  return createId();
}
