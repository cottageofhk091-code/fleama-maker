import { NextResponse } from "next/server";
import { logAnalysisEvent } from "@/lib/analytics";
import { generateListing } from "@/lib/gemini";
import { sendGA4Event } from "@/lib/ga4-mp";
import { computeSeoInsights } from "@/lib/seo-insights";
import { getOrCreateUserId } from "@/lib/user-session";
import {
  CATEGORIES,
  CONDITIONS,
  canSubmitProductInput,
  hasRequiredProductIdentity,
} from "@/lib/types";
import type { ProductInput } from "@/lib/types";
import * as Sentry from "@sentry/nextjs";

export const maxDuration = 60;

function isProductInput(body: unknown): body is ProductInput {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (
    !(
      typeof b.category === "string" &&
      (CATEGORIES as readonly string[]).includes(b.category) &&
      typeof b.brand === "string" &&
      typeof b.productName === "string" &&
      typeof b.modelNumber === "string" &&
      hasRequiredProductIdentity({
        brand: b.brand,
        productName: b.productName,
        modelNumber: b.modelNumber,
      }) &&
      typeof b.condition === "string" &&
      (CONDITIONS as readonly string[]).includes(b.condition)
    )
  ) {
    return false;
  }

  return canSubmitProductInput({
    category: b.category as ProductInput["category"],
    brand: b.brand as string,
    productName: b.productName as string,
    modelNumber: b.modelNumber as string,
    size: typeof b.size === "string" ? b.size : undefined,
    operationStatus:
      typeof b.operationStatus === "string" ? b.operationStatus : undefined,
    remainingAmount:
      typeof b.remainingAmount === "string" ? b.remainingAmount : undefined,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ProductInput & {
      premiumFeatures?: { trendSeo?: boolean };
      includeInsights?: boolean;
      proCopyQuality?: boolean;
      isTrial?: boolean;
    };
    if (!isProductInput(body)) {
      return NextResponse.json(
        {
          error:
            "必須項目が不足しています。メーカー・商品名・型番、およびカテゴリ別の必須項目を確認してください。",
        },
        { status: 400 },
      );
    }

    const input: ProductInput = {
      category: body.category,
      brand: body.brand.trim(),
      productName: body.productName.trim(),
      modelNumber: body.modelNumber.trim(),
      condition: body.condition,
      conditionMemo:
        typeof body.conditionMemo === "string"
          ? body.conditionMemo.trim() || undefined
          : undefined,
      size: body.size?.trim() || undefined,
      operationStatus: body.operationStatus?.trim() || undefined,
      remainingAmount: body.remainingAmount?.trim() || undefined,
      color: body.color?.trim() || undefined,
      notes: body.notes?.trim() || undefined,
    };

    const result = await generateListing(input, {
      trendSeo: Boolean(body.premiumFeatures?.trendSeo),
      proCopyQuality: Boolean(body.proCopyQuality || body.includeInsights),
    });

    try {
      await sendGA4Event("item_analyzed", {
        event_category: "fleamarket",
      });
    } catch (gaError) {
      console.error("GA4 send error:", gaError);
    }

    try {
      const { userId } = await getOrCreateUserId();
      void logAnalysisEvent({
        user_id: userId,
        metadata: {
          category: input.category,
          brand: input.brand,
          include_insights: Boolean(body.includeInsights),
          source: "generate",
          is_trial: Boolean(body.isTrial),
        },
      });
    } catch (analyticsError) {
      console.error("Analytics event log error:", analyticsError);
    }

    if (body.includeInsights) {
      return NextResponse.json({
        ...result,
        insights: computeSeoInsights(input, result),
        resolvedInput: input,
      });
    }

    return NextResponse.json({ ...result, resolvedInput: input });
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      {
        error:
          "生成中にエラーが発生しました。しばらくしてから再度お試しください。",
      },
      { status: 500 },
    );
  }
}
