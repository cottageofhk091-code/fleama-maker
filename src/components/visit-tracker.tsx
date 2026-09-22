"use client";

import { useEffect, useRef } from "react";
import { trackVisit } from "@/lib/analytics";
import {
  getOrCreateAnalyticsSessionId,
  resolveAnalyticsUserId,
} from "@/lib/analytics-session";
import { getSupabase } from "@/lib/supabase";

/**
 * 全ページ共通: マウント時に 1 セッション 1 度だけ流入元を analytics_visits へ記録する。
 */
export function VisitTracker() {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      try {
        const session_id = getOrCreateAnalyticsSessionId();
        const supabase = getSupabase();
        const authUser = supabase
          ? (await supabase.auth.getUser()).data.user
          : null;
        const user_id = authUser?.id ?? (await resolveAnalyticsUserId());
        await trackVisit({ session_id, user_id });
      } catch (error) {
        console.error("Visit tracking failed:", error);
      }
    })();
  }, []);

  return null;
}

/** @deprecated VisitTracker を利用してください */
export const AnalyticsVisitLogger = VisitTracker;
