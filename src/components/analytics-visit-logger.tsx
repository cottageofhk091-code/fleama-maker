"use client";

import { useEffect, useRef } from "react";
import { logVisit } from "@/lib/analytics";
import {
  getOrCreateAnalyticsSessionId,
  resolveAnalyticsUserId,
} from "@/lib/analytics-session";
import { getSupabase } from "@/lib/supabase";

function readUtmSource(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fromQuery = new URLSearchParams(window.location.search).get(
      "utm_source",
    );
    if (fromQuery?.trim()) {
      const value = fromQuery.trim().slice(0, 200);
      sessionStorage.setItem("furima_sold_utm_source", value);
      return value;
    }
    return sessionStorage.getItem("furima_sold_utm_source");
  } catch {
    return null;
  }
}

function readReferrer(): string | null {
  if (typeof document === "undefined") return null;
  const ref = document.referrer?.trim();
  if (!ref) return null;
  try {
    const currentHost = window.location.hostname;
    const refHost = new URL(ref).hostname;
    if (refHost === currentHost) return null;
  } catch {
    // keep raw referrer
  }
  return ref.slice(0, 500);
}

/**
 * トップ等の表示時に 1 回だけ analytics_visits へ送信する。
 */
export function AnalyticsVisitLogger() {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    void (async () => {
      try {
        const session_id = getOrCreateAnalyticsSessionId();
        const supabase = getSupabase();
        const authUser = supabase
          ? (await supabase.auth.getUser()).data.user
          : null;
        const user_id = authUser?.id ?? (await resolveAnalyticsUserId());
        await logVisit({
          session_id,
          user_id,
          utm_source: readUtmSource(),
          referrer: readReferrer(),
        });
      } catch (error) {
        console.error("Analytics visit log error:", error);
      }
    })();
  }, []);

  return null;
}
