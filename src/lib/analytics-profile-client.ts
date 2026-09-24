"use client";

import { resolveAnalyticsUserId } from "@/lib/analytics-session";
import {
  fetchFreeCredits,
  logAnalysisEvent,
  saveUserProfile,
  type UserProfileInput,
} from "@/lib/analytics";

/** 会員登録・プラン変更・アンケート回答後の profiles upsert（非同期・失敗無視） */
export function persistAnalyticsProfile(
  partial: Omit<UserProfileInput, "user_id"> & { user_id?: string },
): void {
  void (async () => {
    try {
      const user_id =
        partial.user_id?.trim() || (await resolveAnalyticsUserId());
      await saveUserProfile({
        user_id,
        plan_type: partial.plan_type,
        age_group: partial.age_group,
        region: partial.region,
        has_used_pro_trial: partial.has_used_pro_trial,
        free_credits: partial.free_credits,
      });
    } catch (error) {
      console.error("Analytics profile save error:", error);
    }
  })();
}

/** Pro お試し消費を profiles.free_credits=0 へ反映 */
export async function consumeProTrialRemote(userId?: string): Promise<void> {
  try {
    const user_id = userId?.trim() || (await resolveAnalyticsUserId());
    await saveUserProfile({
      user_id,
      free_credits: 0,
      has_used_pro_trial: true,
    });
    void logAnalysisEvent({
      user_id,
      metadata: {
        is_trial: true,
        source: "pro_trial",
        free_credits: 0,
      },
    });
  } catch (error) {
    console.error("Pro trial consume error:", error);
  }
}

/** ログイン後にサーバー上の free_credits を取得 */
export async function loadFreeCreditsFromServer(
  userId?: string,
): Promise<{ freeCredits: number; hasUsedProTrial: boolean } | null> {
  try {
    const user_id = userId?.trim() || (await resolveAnalyticsUserId());
    if (!user_id) return null;
    return await fetchFreeCredits(user_id);
  } catch (error) {
    console.error("Free credits fetch error:", error);
    return null;
  }
}

/** @deprecated loadFreeCreditsFromServer を利用 */
export async function loadHasUsedProTrialFromServer(
  userId?: string,
): Promise<boolean | null> {
  const snap = await loadFreeCreditsFromServer(userId);
  if (!snap) return null;
  return snap.hasUsedProTrial;
}
