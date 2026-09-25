import { createHmac, timingSafeEqual } from "crypto";
import { PROFILE_PLAN } from "@/lib/billing/quotas";
import { isDevProBypassEnabled } from "@/lib/billing/dev-bypass";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const PRO_TRIAL_EXHAUSTED_MESSAGE =
  "Pro機能の無料試用枠は終了しました。有料プランをご利用ください";

const TRIAL_TOKEN_TTL_MS = 15 * 60 * 1000;

export type FreeCreditsSnapshot = {
  freeCredits: number;
  hasUsedProTrial: boolean;
  planType: string | null;
};

type ProfileRow = {
  id: string;
  free_credits?: number | null;
  has_used_pro_trial?: boolean | null;
  plan_type?: string | null;
};

function normalizeCredits(
  freeCredits: number | null | undefined,
  hasUsedProTrial: boolean,
): number {
  if (typeof freeCredits === "number" && !Number.isNaN(freeCredits)) {
    return Math.max(0, Math.floor(freeCredits));
  }
  // NULL / 未設定は初回のみ 1（消費フラグが立っていれば 0）
  return hasUsedProTrial ? 0 : 1;
}

function trialTokenSecret(): string {
  return (
    process.env.SESSION_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "fleama-pro-trial-secret"
  );
}

/** お試し消費直後〜一括生成用の短命トークン */
export function issueProTrialToken(userId: string): string {
  const exp = Date.now() + TRIAL_TOKEN_TTL_MS;
  const payload = `${userId}.${exp}`;
  const sig = createHmac("sha256", trialTokenSecret())
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

export function verifyProTrialToken(
  userId: string,
  token: string | null | undefined,
): boolean {
  if (!token?.trim()) return false;
  const parts = token.trim().split(".");
  if (parts.length !== 3) return false;
  const [uid, expStr, sig] = parts;
  if (uid !== userId) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const payload = `${uid}.${expStr}`;
  const expected = createHmac("sha256", trialTokenSecret())
    .update(payload)
    .digest("hex");
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expected, "utf8");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * 新規登録時: profiles を free_credits=1 で確実に作成（Service Role）
 */
export async function ensureSignupProfile(userId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin || !userId.trim()) return;

  const { data, error } = await admin
    .from("profiles")
    .select("id, free_credits, has_used_pro_trial, plan_type")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[free-credits] ensureSignupProfile select:", error);
  }

  const row = data as ProfileRow | null;
  if (!row) {
    const { error: upsertError } = await admin.from("profiles").upsert(
      [
        {
          id: userId,
          plan_type: PROFILE_PLAN.free,
          free_credits: 1,
          has_used_pro_trial: false,
        },
      ],
      { onConflict: "id" },
    );
    if (upsertError) {
      console.error("[free-credits] ensureSignupProfile insert:", upsertError);
      if (
        /free_credits/i.test(upsertError.message || "") ||
        upsertError.code === "PGRST204"
      ) {
        console.error(
          "[free-credits] profiles.free_credits 列がありません。supabase/migrations/20260325_profiles_free_credits.sql を SQL Editor で実行してください。",
        );
      }
    }
    return;
  }

  if (row.free_credits == null && !row.has_used_pro_trial) {
    const { error: updateError } = await admin
      .from("profiles")
      .update({ free_credits: 1, has_used_pro_trial: false })
      .eq("id", userId);
    if (updateError) {
      console.error("[free-credits] ensureSignupProfile backfill:", updateError);
    }
  }
}

/**
 * profiles から free_credits を取得。NULL は初回のみ 1 にフォールバック
 */
export async function getFreeCreditsSnapshot(
  userId: string,
): Promise<FreeCreditsSnapshot | null> {
  const admin = getSupabaseAdmin();
  if (!admin || !userId.trim()) return null;

  const { data, error } = await admin
    .from("profiles")
    .select("id, free_credits, has_used_pro_trial, plan_type")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[free-credits] getFreeCreditsSnapshot:", error);
    return null;
  }

  if (!data) {
    await ensureSignupProfile(userId);
    return {
      freeCredits: 1,
      hasUsedProTrial: false,
      planType: PROFILE_PLAN.free,
    };
  }

  const row = data as ProfileRow;
  const usedFlag = Boolean(row.has_used_pro_trial);
  let freeCredits = normalizeCredits(row.free_credits, usedFlag);

  if (row.free_credits == null && !usedFlag) {
    await admin
      .from("profiles")
      .update({ free_credits: 1, has_used_pro_trial: false })
      .eq("id", userId);
    freeCredits = 1;
  }

  if (usedFlag || freeCredits <= 0) {
    freeCredits = 0;
  }

  return {
    freeCredits,
    hasUsedProTrial: freeCredits <= 0,
    planType: row.plan_type ?? null,
  };
}

export type ProCreditCheckResult =
  | {
      ok: true;
      paid: boolean;
      shouldConsume: boolean;
      freeCredits: number;
    }
  | {
      ok: false;
      freeCredits: number;
      message: string;
    };

/**
 * Pro 機能実行前のクレジット確認
 * trialToken がある場合は消費済みお試し枠内の継続リクエストとして許可
 */
export async function checkProCredits(
  userId: string | null,
  options?: { trialToken?: string | null },
): Promise<ProCreditCheckResult> {
  if (isDevProBypassEnabled()) {
    return { ok: true, paid: true, shouldConsume: false, freeCredits: 0 };
  }

  if (!userId) {
    console.error(
      "[Pro Credit Check Error]: userId=(missing) free_credits=(n/a)",
    );
    return {
      ok: false,
      freeCredits: 0,
      message: PRO_TRIAL_EXHAUSTED_MESSAGE,
    };
  }

  if (verifyProTrialToken(userId, options?.trialToken)) {
    return {
      ok: true,
      paid: false,
      shouldConsume: false,
      freeCredits: 0,
    };
  }

  const snap = await getFreeCreditsSnapshot(userId);
  const freeCredits = snap?.freeCredits ?? 0;
  const planType = snap?.planType ?? null;

  if (planType === PROFILE_PLAN.paid) {
    return {
      ok: true,
      paid: true,
      shouldConsume: false,
      freeCredits,
    };
  }

  if (freeCredits >= 1) {
    return {
      ok: true,
      paid: false,
      shouldConsume: true,
      freeCredits,
    };
  }

  console.error(
    `[Pro Credit Check Error]: userId=${userId} free_credits=${freeCredits}`,
  );
  return {
    ok: false,
    freeCredits,
    message: PRO_TRIAL_EXHAUSTED_MESSAGE,
  };
}

/**
 * 成功時に free_credits を 1 → 0 へ消費し、継続用 trialToken を発行
 */
export async function consumeFreeCredit(
  userId: string,
): Promise<{
  success: boolean;
  remainingCredits: number;
  trialToken?: string;
}> {
  const admin = getSupabaseAdmin();
  if (!admin || !userId.trim()) {
    console.error(
      `[Pro Credit Check Error]: userId=${userId || "(missing)"} free_credits=(consume-failed-no-admin)`,
    );
    return { success: false, remainingCredits: 0 };
  }

  const { data, error } = await admin
    .from("profiles")
    .update({
      free_credits: 0,
      has_used_pro_trial: true,
    })
    .eq("id", userId)
    .gt("free_credits", 0)
    .select("free_credits")
    .maybeSingle();

  if (error) {
    console.error(
      `[Pro Credit Check Error]: userId=${userId} free_credits=(update-error)`,
      error,
    );
    return { success: false, remainingCredits: 0 };
  }

  if (!data) {
    const snap = await getFreeCreditsSnapshot(userId);
    console.error(
      `[Pro Credit Check Error]: userId=${userId} free_credits=${snap?.freeCredits ?? 0}`,
    );
    return { success: false, remainingCredits: 0 };
  }

  return {
    success: true,
    remainingCredits: 0,
    trialToken: issueProTrialToken(userId),
  };
}
