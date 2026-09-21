"use client";

import { resolveAnalyticsUserId } from "@/lib/analytics-session";
import {
  fetchHasUsedProTrial,
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
      });
    } catch (error) {
      console.error("Analytics profile save error:", error);
    }
  })();
}

/** Pro お試し消費を profiles へ反映 + 分析イベント送信 */
export async function consumeProTrialRemote(userId?: string): Promise<void> {
  try {
    const user_id = userId?.trim() || (await resolveAnalyticsUserId());
    await saveUserProfile({
      user_id,
      has_used_pro_trial: true,
    });
    void logAnalysisEvent({
      user_id,
      metadata: {
        is_trial: true,
        source: "pro_trial",
      },
    });
  } catch (error) {
    console.error("Pro trial consume error:", error);
  }
}

/** ログイン後にサーバー上の消費フラグを取得 */
export async function loadHasUsedProTrialFromServer(
  userId?: string,
): Promise<boolean | null> {
  try {
    const user_id = userId?.trim() || (await resolveAnalyticsUserId());
    if (!user_id) return null;
    return await fetchHasUsedProTrial(user_id);
  } catch (error) {
    console.error("Pro trial fetch error:", error);
    return null;
  }
}
