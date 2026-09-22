import { getSupabase } from "@/lib/supabase";

/** フリマリストSold の共通アナリティクス識別子 */
export const APP_ID = "furima_sold" as const;

const VISIT_TRACKED_KEY = "furima_sold_has_tracked_visit";

export type AnalysisMetadata = Record<
  string,
  string | number | boolean | null | undefined
>;

export type UserProfileInput = {
  user_id: string;
  plan_type?: string | null;
  age_group?: string | null;
  region?: string | null;
  /** Pro機能の1回無料お試しを使用済みか */
  has_used_pro_trial?: boolean | null;
};

export type VisitSourceCategory =
  | "Direct"
  | "X"
  | "note"
  | "Google"
  | "Yahoo"
  | "Instagram"
  | "Other Referral"
  | string;

/**
 * UTM / referrer から流入元カテゴリを判別する
 */
export function classifyVisitSource(
  utmSource: string | null | undefined,
  referrer: string | null | undefined,
): VisitSourceCategory {
  if (utmSource?.trim()) {
    const src = utmSource.trim().toLowerCase();
    if (
      src === "x" ||
      src.startsWith("x_") ||
      src.endsWith("_x") ||
      src.includes("twitter") ||
      src.includes("x.com")
    ) {
      return "X";
    }
    if (src.includes("note")) return "note";
    if (src.includes("google")) return "Google";
    if (src.includes("yahoo")) return "Yahoo";
    if (src.includes("instagram") || src === "ig") return "Instagram";
    return utmSource.trim().slice(0, 100);
  }

  if (referrer?.trim()) {
    const ref = referrer.trim().toLowerCase();
    if (
      ref.includes("t.co") ||
      ref.includes("x.com") ||
      ref.includes("twitter.com")
    ) {
      return "X";
    }
    if (ref.includes("note.com")) return "note";
    if (ref.includes("google.")) return "Google";
    if (ref.includes("yahoo.")) return "Yahoo";
    if (ref.includes("instagram.com")) return "Instagram";
    return "Other Referral";
  }

  return "Direct";
}

/**
 * 訪問ログ → analytics_visits
 */
export async function logVisit(params: {
  session_id: string;
  user_id: string;
  utm_source?: string | null;
  referrer?: string | null;
  source_category?: string | null;
}): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const utm = params.utm_source?.trim() || null;
  const referrer = params.referrer?.trim() || null;
  const source_category =
    params.source_category?.trim() ||
    classifyVisitSource(utm, referrer);

  const { error } = await supabase.from("analytics_visits").insert([
    {
      app_id: APP_ID,
      session_id: params.session_id,
      user_id: params.user_id,
      utm_source: utm,
      referrer,
      source_category,
    },
  ]);

  if (error) {
    console.error("Supabase analytics_visits error:", error);
    return false;
  }
  return true;
}

/**
 * ブラウザ 1 セッションにつき 1 度だけ訪問を記録する（クライアント専用）
 */
export async function trackVisit(params: {
  session_id: string;
  user_id: string;
}): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    if (sessionStorage.getItem(VISIT_TRACKED_KEY)) return;
  } catch {
    // sessionStorage 不可時は続行（重複の可能性あり）
  }

  let utmSource: string | null = null;
  try {
    const fromQuery = new URLSearchParams(window.location.search).get(
      "utm_source",
    );
    if (fromQuery?.trim()) {
      utmSource = fromQuery.trim().slice(0, 200);
      sessionStorage.setItem("furima_sold_utm_source", utmSource);
    } else {
      utmSource = sessionStorage.getItem("furima_sold_utm_source");
    }
  } catch {
    utmSource = null;
  }

  let referrer: string | null = null;
  try {
    const raw = document.referrer?.trim() || "";
    if (raw) {
      try {
        const refHost = new URL(raw).hostname;
        if (refHost !== window.location.hostname) {
          referrer = raw.slice(0, 500);
        }
      } catch {
        referrer = raw.slice(0, 500);
      }
    }
  } catch {
    referrer = null;
  }

  const sourceCategory = classifyVisitSource(utmSource, referrer);

  try {
    const ok = await logVisit({
      session_id: params.session_id,
      user_id: params.user_id,
      utm_source: utmSource,
      referrer,
      source_category: sourceCategory,
    });
    if (!ok) return;
    try {
      sessionStorage.setItem(VISIT_TRACKED_KEY, "true");
    } catch {
      // ignore
    }
  } catch (err) {
    console.error("Visit tracking failed:", err);
  }
}

/**
 * 分析・検索実行ログ → analytics_events
 */
export async function logAnalysisEvent(params: {
  user_id: string;
  metadata?: AnalysisMetadata;
}): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from("analytics_events").insert([
    {
      app_id: APP_ID,
      event_type: "analysis_executed",
      user_id: params.user_id,
      metadata: params.metadata ?? {},
    },
  ]);

  if (error) {
    console.error("Supabase analytics_events error:", error);
  }
}

/**
 * 会員・アンケートプロフィール → profiles（upsert）
 */
export async function saveUserProfile(
  params: UserProfileInput,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const row: Record<string, string | boolean | null> = {
    id: params.user_id,
    app_id: APP_ID,
  };
  if (params.plan_type !== undefined) {
    row.plan_type = params.plan_type;
  }
  if (params.age_group !== undefined) {
    row.age_group = params.age_group;
  }
  if (params.region !== undefined) {
    row.region = params.region;
  }
  if (params.has_used_pro_trial !== undefined) {
    row.has_used_pro_trial = Boolean(params.has_used_pro_trial);
  }

  const { error } = await supabase.from("profiles").upsert([row], {
    onConflict: "id",
  });

  if (error) {
    console.error("Supabase profiles upsert error:", error);
  }
}

/**
 * profiles から Pro お試し消費フラグを取得
 */
export async function fetchHasUsedProTrial(
  userId: string,
): Promise<boolean | null> {
  const supabase = getSupabase();
  if (!supabase || !userId.trim()) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("has_used_pro_trial")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Supabase profiles select error:", error);
    return null;
  }
  if (!data) return false;
  return Boolean(
    (data as { has_used_pro_trial?: boolean | null }).has_used_pro_trial,
  );
}
