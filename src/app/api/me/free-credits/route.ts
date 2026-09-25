import { NextResponse } from "next/server";
import { getRequestAuthUser } from "@/lib/auth-request";
import {
  ensureSignupProfile,
  getFreeCreditsSnapshot,
} from "@/lib/billing/free-credits-server";

export const runtime = "nodejs";

/**
 * GET /api/me/free-credits
 * ログインユーザーの DB 上 free_credits を返す（NULL は初回 1）
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
