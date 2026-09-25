import { NextResponse } from "next/server";
import { logAnalysisEventServer } from "@/lib/analytics";
import { getRequestAuthUser } from "@/lib/auth-request";
import {
  consumeFreeCredit,
  ensureSignupProfile,
  getFreeCreditsSnapshot,
  PRO_TRIAL_EXHAUSTED_MESSAGE,
} from "@/lib/billing/free-credits-server";

export const runtime = "nodejs";

/**
 * GET /api/me/free-credits
 * ログインユーザーの free_credits を返す（NULL は初回 1）
 */
export async function GET(request: Request) {
  const user = await getRequestAuthUser(request);
  if (!user?.id) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  await ensureSignupProfile(user.id);
  const snap = await getFreeCreditsSnapshot(user.id);
  if (!snap) {
    return NextResponse.json(
      { error: "クレジット情報の取得に失敗しました。" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    freeCredits: snap.freeCredits,
    hasUsedProTrial: snap.hasUsedProTrial,
    planType: snap.planType,
    remainingCredits: snap.freeCredits,
  });
}

/**
 * POST /api/me/free-credits
 * お試し確認「使用する」時のみクレジットを 1→0 に消費
 */
export async function POST(request: Request) {
  const user = await getRequestAuthUser(request);
  if (!user?.id) {
    return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
  }

  const snap = await getFreeCreditsSnapshot(user.id);
  const credits = snap?.freeCredits ?? 0;
  console.log("[Credit Check]", {
    userId: user.id,
    credits,
    action: "consume",
  });

  if (credits < 1) {
    console.error(
      `[Pro Credit Check Error]: userId=${user.id} free_credits=${credits}`,
    );
    return NextResponse.json(
      {
        success: false,
        remainingCredits: 0,
        error: PRO_TRIAL_EXHAUSTED_MESSAGE,
      },
      { status: 403 },
    );
  }

  const consumed = await consumeFreeCredit(user.id);
  if (!consumed.success) {
    console.error(
      `[Pro Credit Check Error]: userId=${user.id} free_credits=(consume-api-failed)`,
    );
    return NextResponse.json(
      {
        success: false,
        remainingCredits: 0,
        error: PRO_TRIAL_EXHAUSTED_MESSAGE,
      },
      { status: 403 },
    );
  }

  const logged = await logAnalysisEventServer({
    user_id: user.id,
    event_type: "analysis_executed",
    metadata: {
      source: "pro_trial_consume",
      is_trial: true,
      free_credits: 0,
      remaining_credits: 0,
    },
  });
  if (!logged) {
    console.error(
      "[free-credits] 消費は成功したが analytics_events 書き込み失敗",
      { userId: user.id },
    );
  }

  return NextResponse.json({
    success: true,
    remainingCredits: 0,
    trialToken: consumed.trialToken,
  });
}
