import type { BoostPattern, GenerateResult, ProductInput } from "@/lib/types";
import type { SeoInsights } from "@/lib/seo-insights";
import {
  boostCommentsFromPatterns,
  buildLocalBoostPatterns,
} from "@/lib/boost-patterns";

/**
 * Prefer AI-generated boost patterns from GenerateResult; fall back to local.
 */
export function resolveBoostPatterns(params: {
  input?: ProductInput | null;
  result?: GenerateResult | null;
}): BoostPattern[] {
  const { input, result } = params;
  if (result?.boostPatterns && result.boostPatterns.length === 3) {
    return result.boostPatterns;
  }
  if (input?.brand && input.productName && input.modelNumber) {
    return buildLocalBoostPatterns(input);
  }
  return buildLocalBoostPatterns({
    category: "その他",
    brand: result?.identifiedBrand || "本品",
    productName: result?.identifiedProduct || "商品",
    modelNumber: "—",
    condition: "目立った傷や汚れなし",
  });
}

/**
 * Prefer AI-generated boost lines from GenerateResult; fall back to local.
 */
export function generateSaleBoostComments(params: {
  input?: ProductInput | null;
  result?: GenerateResult | null;
  insights?: SeoInsights | null;
}): string[] {
  const patterns = resolveBoostPatterns(params);
  return boostCommentsFromPatterns(patterns);
}

export function formatBoostBlock(comments: string[]): string {
  if (comments.length === 0) return "";
  return [
    "【🔥 購買促進ブースト】",
    ...comments.map((c) => `・${c}`),
  ].join("\n");
}

export function integrateBoostIntoDescription(
  description: string,
  comments: string[],
): string {
  if (!comments.length) return description;
  if (
    description.includes("【🔥 購買促進ブースト】") ||
    description.includes("【🔥 今すぐ欲しくなるポイント】") ||
    description.includes("【購入ポイント / AI売却ブースト】")
  ) {
    return description;
  }
  return `${description.trim()}\n\n${formatBoostBlock(comments)}\n`;
}

export function integrateSelectedBoost(
  description: string,
  comment: string,
): string {
  if (!comment.trim()) return description;
  // Strip previous boost block if present, then append selected one
  const stripped = description
    .replace(/\n*【🔥 購買促進ブースト】[\s\S]*$/m, "")
    .replace(/\n*【🔥 今すぐ欲しくなるポイント】[\s\S]*$/m, "")
    .trim();
  return `${stripped}\n\n${formatBoostBlock([comment])}\n`;
}
