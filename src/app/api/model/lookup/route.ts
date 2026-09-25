import { NextResponse } from "next/server";
import { logAnalysisEventServer } from "@/lib/analytics";
import { estimateModelVariants, extractCodeHint } from "@/lib/model-estimate";
import { lookupModelVariants } from "@/lib/model-lookup";
import { getOrCreateUserId } from "@/lib/user-session";
import * as Sentry from "@sentry/nextjs";

export const maxDuration = 60;

/**
 * Always returns 200 + ≥1 candidates for non-empty queries.
 * Never responds with "候補が見つかりません".
 */
export async function POST(request: Request) {
  let query = "";
  try {
    const body = (await request.json()) as { query?: string };
    query = typeof body.query === "string" ? body.query.trim() : "";
  } catch {
    return NextResponse.json(
      {
        error:
          "型番・商品名を入力してください（例: PCF-SC15T サーキュレーター / A2588）",
      },
      { status: 400 },
    );
  }

  if (!query) {
    return NextResponse.json(
      {
        error:
          "型番・商品名を入力してください（例: PCF-SC15T サーキュレーター / A2588）",
      },
      { status: 400 },
    );
  }

  try {
    const result = await lookupModelVariants(query);
    const candidates =
      result.candidates?.length > 0
        ? result.candidates
        : estimateModelVariants(extractCodeHint(query), query).candidates;

    try {
      const { userId } = await getOrCreateUserId();
      await logAnalysisEventServer({
        user_id: userId,
        metadata: {
          source: "model_lookup",
          query_length: query.length,
          candidate_count: candidates.length,
        },
      });
    } catch (analyticsError) {
      console.error("Analytics event log error:", analyticsError);
    }

    return NextResponse.json({
      ...result,
      candidates,
      source: result.source || "ai",
    });
  } catch (error) {
    Sentry.captureException(error);
    // Absolute fallback — still 200 with estimated models
    const fallback = estimateModelVariants(extractCodeHint(query), query);
    try {
      const { userId } = await getOrCreateUserId();
      await logAnalysisEventServer({
        user_id: userId,
        metadata: {
          source: "model_lookup_fallback",
          query_length: query.length,
          candidate_count: fallback.candidates?.length ?? 0,
        },
      });
    } catch (analyticsError) {
      console.error("Analytics event log error:", analyticsError);
    }
    return NextResponse.json(fallback);
  }
}
