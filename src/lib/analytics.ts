import { getSupabase } from "@/lib/supabase";

/** フリマリストSold の共通アナリティクス識別子 */
export const APP_ID = "furima_sold" as const;

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

/**
 * 訪問ログ → analytics_visits
 */
export async function logVisit(params: {
  session_id: string;
  user_id: string;
  utm_source?: string | null;
  referrer?: string | null;
}): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase.from("analytics_visits").insert([
    {
      app_id: APP_ID,
      session_id: params.session_id,
      user_id: params.user_id,
      utm_source: params.utm_source?.trim() || null,
      referrer: params.referrer?.trim() || null,
    },
  ]);

  if (error) {
    console.error("Supabase analytics_visits error:", error);
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
