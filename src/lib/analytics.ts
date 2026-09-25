import { getSupabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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
  /** Pro機能の1回無料お試しを使用済みか（free_credits<=0 と同期） */
  has_used_pro_trial?: boolean | null;
  /** Pro 無料枠残数（新規 1） */
  free_credits?: number | null;
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
 * 分析・検索実行ログ → analytics_events（ブラウザ / anon）
 */
export async function logAnalysisEvent(params: {
  user_id: string;
  metadata?: AnalysisMetadata;
  event_type?: string;
}): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { error } = await supabase.from("analytics_events").insert([
    {
      app_id: APP_ID,
      event_type: params.event_type ?? "analysis_executed",
      user_id: params.user_id,
      metadata: params.metadata ?? {},
    },
  ]);

  if (error) {
    console.error("Supabase analytics_events error:", error);
    return false;
  }
  return true;
}

/**
 * サーバー専用: Service Role で analytics_events へ確実に await 書き込み。
 * 中央管理ダッシュボードの生成回数集計（COUNT）の本丸。
 */
export async function logAnalysisEventServer(params: {
  user_id: string;
  metadata?: AnalysisMetadata;
  event_type?: string;
}): Promise<boolean> {
  const eventType = params.event_type ?? "analysis_executed";
  const admin = getSupabaseAdmin();

  if (!admin) {
    console.error(
      "[analytics] logAnalysisEventServer: SUPABASE_SERVICE_ROLE_KEY 未設定。anon へフォールバック",
      { user_id: params.user_id, event_type: eventType },
    );
    return logAnalysisEvent(params);
  }

  const row = {
    app_id: APP_ID,
    event_type: eventType,
    user_id: params.user_id,
    metadata: params.metadata ?? {},
  };

  const { error } = await admin.from("analytics_events").insert([row]);
  if (error) {
    console.error("[analytics] analytics_events insert failed:", {
      user_id: params.user_id,
      app_id: APP_ID,
      event_type: eventType,
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return false;
  }

  console.log("[analytics] analytics_events insert ok", {
    user_id: params.user_id,
    app_id: APP_ID,
    event_type: eventType,
  });
  return true;
}

/**
 * 会員・アンケートプロフィール → profiles（upsert）
 * app_id を付けて中央管理ダッシュボードの製品フィルタと整合させる。
 */
export async function saveUserProfile(
  params: UserProfileInput,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const row: Record<string, string | boolean | number | null> = {
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
  if (params.free_credits !== undefined && params.free_credits !== null) {
    const credits = Math.max(0, Math.floor(params.free_credits));
    row.free_credits = credits;
    row.has_used_pro_trial = credits <= 0;
  } else if (params.has_used_pro_trial !== undefined) {
    const used = Boolean(params.has_used_pro_trial);
    row.has_used_pro_trial = used;
    row.free_credits = used ? 0 : 1;
  }

  const { error } = await supabase.from("profiles").upsert([row], {
    onConflict: "id",
  });

  if (error) {
    console.error("Supabase profiles upsert error:", error);
    if (
      /free_credits/i.test(error.message || "") ||
      error.code === "PGRST204"
    ) {
      console.error(
        "[Pro Credit Check Error]: profiles.free_credits 列が見つかりません。マイグレーションを適用してください。",
      );
    }
    // app_id 列が無い環境では app_id なしで再試行
    if (/app_id/i.test(error.message || "") || error.code === "PGRST204") {
      const withoutAppId = { ...row };
      delete withoutAppId.app_id;
      const retry = await supabase.from("profiles").upsert([withoutAppId], {
        onConflict: "id",
      });
      if (retry.error) {
        console.error("Supabase profiles upsert retry error:", retry.error);
      }
    }
  }
}

export type FreeCreditsSnapshot = {
  freeCredits: number;
  hasUsedProTrial: boolean;
};

/**
 * profiles から free_credits / お試し消費状態を取得
 */
export async function fetchFreeCredits(
  userId: string,
): Promise<FreeCreditsSnapshot | null> {
  const supabase = getSupabase();
  if (!supabase || !userId.trim()) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("free_credits, has_used_pro_trial")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Supabase profiles select error:", error);
    return null;
  }
  if (!data) {
    return { freeCredits: 1, hasUsedProTrial: false };
  }

  const row = data as {
    free_credits?: number | null;
    has_used_pro_trial?: boolean | null;
  };
  const usedFlag = Boolean(row.has_used_pro_trial);
  // NULL は初回のみ 1（消費済みフラグがあれば 0）
  let freeCredits =
    typeof row.free_credits === "number" && !Number.isNaN(row.free_credits)
      ? Math.max(0, Math.floor(row.free_credits))
      : usedFlag
        ? 0
        : 1;
  // どちらか一方でも消費済みなら残0（再ログインで戻さない）
  if (usedFlag || freeCredits <= 0) {
    freeCredits = 0;
  }
  return {
    freeCredits,
    hasUsedProTrial: freeCredits <= 0,
  };
}

/**
 * profiles から Pro お試し消費フラグを取得
 * @deprecated fetchFreeCredits を利用してください
 */
export async function fetchHasUsedProTrial(
  userId: string,
): Promise<boolean | null> {
  const snap = await fetchFreeCredits(userId);
  if (!snap) return null;
  return snap.hasUsedProTrial;
}
