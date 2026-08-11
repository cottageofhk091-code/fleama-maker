import { NextResponse } from "next/server";
import { estimateModelVariants, extractCodeHint } from "@/lib/model-estimate";
import { lookupModelVariants } from "@/lib/model-lookup";
import * as Sentry from "@sentry/nextjs";

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

    return NextResponse.json({
      ...result,
      candidates,
      source: result.source || "ai",
    });
  } catch (error) {
    Sentry.captureException(error);
    // Absolute fallback — still 200 with estimated models
    const fallback = estimateModelVariants(extractCodeHint(query), query);
    return NextResponse.json(fallback);
  }
}
