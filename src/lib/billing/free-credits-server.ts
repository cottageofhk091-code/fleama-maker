import { createHmac, timingSafeEqual } from "crypto";
import { APP_ID } from "@/lib/analytics";
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

function isMissingCreditsColumn(error: {
  message?: string;
  code?: string;
} | null): boolean {
  if (!error) return false;
  const msg = error.message || "";
  return (
    error.code === "PGRST204" ||
    error.code === "42703" ||
    /free_credits|free_pro_credits/i.test(msg)
  );
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

/** profiles 列が無い環境向け: auth user_metadata に free_credits を保持 */
async function readMetadataCredits(
  userId: string,
  options?: { initIfMissing?: boolean },
): Promise<FreeCreditsSnapshot> {
  const initIfMissing = options?.initIfMissing !== false;
  const admin = getSupabaseAdmin();
  if (!admin) {
    return {
      freeCredits: 1,
      hasUsedProTrial: false,
      planType: PROFILE_PLAN.free,
    };
  }

  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data.user) {
    console.error("[free-credits] metadata getUserById:", error);
    return {
      freeCredits: 1,
      hasUsedProTrial: false,
      planType: PROFILE_PLAN.free,
    };
  }

  const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
  const usedFlag = Boolean(meta.has_used_pro_trial);
  const rawCredits =
    typeof meta.free_credits === "number"
      ? meta.free_credits
      : typeof meta.free_pro_credits === "number"
        ? meta.free_pro_credits
        : null;

  let freeCredits = normalizeCredits(rawCredits, usedFlag);

  // 未設定なら初回 1 を書き込む（消費済みは絶対に触らない）
  if (initIfMissing && rawCredits == null && !usedFlag) {
    await writeMetadataCredits(userId, 1, false, meta);
    freeCredits = 1;
  }

  if (usedFlag || freeCredits <= 0) {
    freeCredits = 0;
  }

  return {
    freeCredits,
    hasUsedProTrial: freeCredits <= 0,
    planType:
      typeof meta.plan_type === "string" ? meta.plan_type : PROFILE_PLAN.free,
  };
}

async function writeMetadataCredits(
  userId: string,
  freeCredits: number,
  hasUsedProTrial: boolean,
  existingMeta?: Record<string, unknown>,
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin) return false;

  let meta = existingMeta;
  if (!meta) {
    const { data } = await admin.auth.admin.getUserById(userId);
    meta = (data.user?.user_metadata ?? {}) as Record<string, unknown>;
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...meta,
      free_credits: freeCredits,
      free_pro_credits: freeCredits,
      has_used_pro_trial: hasUsedProTrial,
      plan_type: meta.plan_type ?? PROFILE_PLAN.free,
    },
  });
  if (error) {
    console.error("[free-credits] metadata update:", error);
    return false;
  }
  return true;
}

/**
 * 新規登録時: free_credits=1 を profiles（可能なら）＋ user_metadata に付与。
 * すでに消費済み（0 / has_used_pro_trial）の場合は絶対に上書きしない。
 */
export async function ensureSignupProfile(userId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin || !userId.trim()) return;

  // metadata: 未設定のときだけ 1。消費済みは触らない
  const metaSnap = await readMetadataCredits(userId, { initIfMissing: true });
  if (metaSnap.hasUsedProTrial || metaSnap.freeCredits <= 0) {
    // 消費済みを profiles にも同期（列がある場合）
    const { error: syncError } = await admin.from("profiles").upsert(
      [
        {
          id: userId,
          plan_type: metaSnap.planType ?? PROFILE_PLAN.free,
          free_credits: 0,
          has_used_pro_trial: true,
        },
      ],
      { onConflict: "id" },
    );
    if (syncError && !isMissingCreditsColumn(syncError)) {
      console.error("[free-credits] ensureSignupProfile sync used:", syncError);
    }
    return;
  }

  const { data, error } = await admin
    .from("profiles")
    .select("id, free_credits, has_used_pro_trial, plan_type")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[free-credits] ensureSignupProfile select:", error);
    if (isMissingCreditsColumn(error)) {
      console.warn(
        "[free-credits] profiles.free_credits 未作成のため user_metadata を使用中。SQL migration の適用を推奨。",
      );
    }
    return;
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
    }
    return;
  }

  // 消費済みフラグがある行は残枠を 0 に揃える
  if (row.has_used_pro_trial || (row.free_credits != null && row.free_credits <= 0)) {
    if (row.free_credits !== 0 || !row.has_used_pro_trial) {
      await admin
        .from("profiles")
        .update({ free_credits: 0, has_used_pro_trial: true })
        .eq("id", userId);
    }
    await writeMetadataCredits(userId, 0, true);
    return;
  }

  // NULL かつ未消費のみ 1 をバックフィル
  if (row.free_credits == null) {
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
 * free_credits を取得。NULL は初回のみ 1。列が無い場合は user_metadata へフォールバック。
 * profiles と metadata のどちらかが消費済みなら 0 を返す（リロードで戻らない）。
 */
export async function getFreeCreditsSnapshot(
  userId: string,
): Promise<FreeCreditsSnapshot | null> {
  const admin = getSupabaseAdmin();
  if (!admin || !userId.trim()) return null;

  const metaSnap = await readMetadataCredits(userId, { initIfMissing: false });

  const { data, error } = await admin
    .from("profiles")
    .select("id, free_credits, has_used_pro_trial, plan_type")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[free-credits] getFreeCreditsSnapshot:", error);
    // 列なし等 → metadata を正とする（未設定ならここで初期化）
    if (metaSnap.freeCredits === 1 && !metaSnap.hasUsedProTrial) {
      const inited = await readMetadataCredits(userId, { initIfMissing: true });
      return inited;
    }
    return metaSnap;
  }

  if (!data) {
    await ensureSignupProfile(userId);
    return readMetadataCredits(userId, { initIfMissing: true });
  }

  const row = data as ProfileRow;
  const usedFlag = Boolean(row.has_used_pro_trial) || metaSnap.hasUsedProTrial;
  let freeCredits = normalizeCredits(row.free_credits, usedFlag);

  // metadata 側が消費済みなら profiles が 1 でも 0 を優先
  if (metaSnap.hasUsedProTrial || metaSnap.freeCredits <= 0) {
    freeCredits = 0;
  }

  if (row.free_credits == null && !usedFlag && metaSnap.freeCredits >= 1) {
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
    planType: row.plan_type ?? metaSnap.planType,
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
 */
export async function checkProCredits(
  userId: string | null,
  options?: { trialToken?: string | null; allowConsumeOnGenerate?: boolean },
): Promise<ProCreditCheckResult> {
  if (isDevProBypassEnabled()) {
    console.log("[Credit Check]", { userId, credits: 0, bypass: true });
    return { ok: true, paid: true, shouldConsume: false, freeCredits: 0 };
  }

  if (!userId) {
    console.log("[Credit Check]", { userId: null, credits: 0 });
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
    console.log("[Credit Check]", {
      userId,
      credits: 0,
      trialToken: true,
    });
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

  console.log("[Credit Check]", { userId, credits: freeCredits });

  if (planType === PROFILE_PLAN.paid) {
    return {
      ok: true,
      paid: true,
      shouldConsume: false,
      freeCredits,
    };
  }

  if (freeCredits >= 1) {
    // 生成 API では自動消費しない。確認ダイアログ経由の trialToken が必要
    // （互換: 明示 consumeOnGenerate 時のみ shouldConsume）
    if (options?.allowConsumeOnGenerate) {
      return {
        ok: true,
        paid: false,
        shouldConsume: true,
        freeCredits,
      };
    }
    console.log("[Credit Check]", {
      userId,
      credits: freeCredits,
      note: "trial_confirm_required",
    });
    return {
      ok: false,
      freeCredits,
      message:
        "Pro無料お試しは確認ダイアログで「お試し枠を使用する」を選んでからご利用ください。",
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
 * 成功時に free_credits を 1 → 0 へ消費し、継続用 trialToken を発行。
 * metadata を先に await して永続化し、その後 profiles も更新する。
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

  // 1) metadata を必ず先に 0 へ（列未作成環境・リロード耐性の本丸）
  const metaOk = await writeMetadataCredits(userId, 0, true);
  if (!metaOk) {
    console.error(
      `[Pro Credit Check Error]: userId=${userId} free_credits=(metadata-consume-failed)`,
    );
    return { success: false, remainingCredits: 0 };
  }

  // 2) profiles も可能なら更新（失敗しても metadata が正なので続行）
  const profilePayload: Record<string, string | number | boolean> = {
    id: userId,
    app_id: APP_ID,
    free_credits: 0,
    has_used_pro_trial: true,
    plan_type: PROFILE_PLAN.free,
  };
  let { error } = await admin.from("profiles").upsert([profilePayload], {
    onConflict: "id",
  });

  if (error && /app_id/i.test(error.message || "")) {
    const withoutAppId = { ...profilePayload };
    delete withoutAppId.app_id;
    ({ error } = await admin.from("profiles").upsert([withoutAppId], {
      onConflict: "id",
    }));
  }

  if (error) {
    console.error(
      `[Pro Credit Check Error]: userId=${userId} free_credits=(profiles-update-error)`,
      error,
    );
    if (!isMissingCreditsColumn(error)) {
      console.warn(
        "[free-credits] profiles 更新失敗だが metadata 消費済みのため success 扱い",
      );
    }
  } else {
    console.log("[Credit Check]", {
      userId,
      credits: 0,
      action: "consumed",
      app_id: APP_ID,
    });
  }

  // 3) 読み戻して確定
  const verify = await readMetadataCredits(userId, { initIfMissing: false });
  if (verify.freeCredits > 0) {
    console.error(
      `[Pro Credit Check Error]: userId=${userId} free_credits=${verify.freeCredits} (verify-failed)`,
    );
    return { success: false, remainingCredits: verify.freeCredits };
  }

  return {
    success: true,
    remainingCredits: 0,
    trialToken: issueProTrialToken(userId),
  };
}
