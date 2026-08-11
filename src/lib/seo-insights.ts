import type { GenerateResult, ProductInput } from "@/lib/types";

export type SaleSpeedLabel =
  | "24時間以内"
  | "3日以内"
  | "1週間前後"
  | "2週間前後"
  | "要価格見直し";

export type SeoInsights = {
  seoScore: number;
  saleSpeed: SaleSpeedLabel;
  priceAdvice: string;
  keywords: string[];
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function hashSeed(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i += 1) {
    h = (h * 31 + text.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Deterministic SEO / sale-speed insights for listing copy.
 * Used for Pro dashboard gauges (works offline / without Gemini).
 */
export function computeSeoInsights(
  input: ProductInput,
  result: GenerateResult,
): SeoInsights {
  const primaryTitle = result.titles[0]?.title ?? "";
  const allTitles = result.titles.map((t) => t.title).join(" ");
  const desc = result.description;
  const tags = result.hashtags;

  let score = 42;
  const keywords: string[] = [];

  if (input.brand.trim()) {
    score += 8;
    keywords.push(input.brand.trim());
  }
  if (input.productName.trim()) {
    score += 8;
    keywords.push(input.productName.trim());
  }
  if (input.modelNumber?.trim()) {
    score += 10;
    keywords.push(input.modelNumber.trim());
  }
  if (input.condition.includes("新品") || input.condition.includes("未使用")) {
    score += 10;
    keywords.push("新品", "未使用");
  } else if (input.condition.includes("目立った傷や汚れなし")) {
    score += 7;
    keywords.push("美品");
  } else {
    score += 3;
  }

  if (input.size) {
    score += 4;
    keywords.push(`サイズ${input.size}`);
  }
  if (input.color) {
    score += 3;
    keywords.push(input.color);
  }
  if (input.notes) {
    score += Math.min(8, Math.floor(input.notes.length / 12));
    if (/即日|本日発送|匿名|付属品|正規/.test(input.notes)) {
      score += 6;
      keywords.push("即日発送");
    }
  }

  if (primaryTitle.length >= 28 && primaryTitle.length <= 64) score += 8;
  else if (primaryTitle.length >= 18) score += 4;

  if (/送料|即日|美品|正規|未使用|希少/.test(allTitles)) score += 6;
  if (desc.includes("コンディション") && desc.includes("発送")) score += 5;
  if (desc.length >= 280) score += 5;
  if (tags.length >= 5) score += 4;
  if (tags.length >= 7) score += 2;

  // slight deterministic jitter so scores aren't identical
  const jitter = hashSeed(`${input.brand}:${input.productName}:${primaryTitle}`) % 7;
  score += jitter - 3;

  score = clamp(Math.round(score), 0, 100);

  let saleSpeed: SaleSpeedLabel;
  if (score >= 85) saleSpeed = "24時間以内";
  else if (score >= 72) saleSpeed = "3日以内";
  else if (score >= 58) saleSpeed = "1週間前後";
  else if (score >= 45) saleSpeed = "2週間前後";
  else saleSpeed = "要価格見直し";

  const priceAdvice = buildAdvice(score, saleSpeed, input);

  const uniqueKeywords = Array.from(
    new Set(
      [
        ...keywords,
        ...tags.map((t) => t.replace(/^#/, "")),
        input.category.split("・")[0],
      ].filter(Boolean),
    ),
  ).slice(0, 8);

  return {
    seoScore: score,
    saleSpeed,
    priceAdvice,
    keywords: uniqueKeywords,
  };
}

function buildAdvice(
  score: number,
  saleSpeed: SaleSpeedLabel,
  input: ProductInput,
): string {
  const brand = input.brand || "本品";
  if (score >= 85) {
    return `${brand}はタイトルSEOが非常に強力です。相場どおり〜やや強気でも${saleSpeed}の成約が見込めます。`;
  }
  if (score >= 72) {
    return `相場よりやや高めでも、タイトルSEOが強力なため${saleSpeed}に売れる見込みです。コンディション詳細を厚くするとさらに加速します。`;
  }
  if (score >= 58) {
    return `検索キーワードは良好です。価格は相場中央〜やや下めで出すと${saleSpeed}の売却が狙いやすいです。`;
  }
  if (score >= 45) {
    return `SEO余地があります。型番・サイズ・状態をタイトル先頭に寄せ、価格を相場より5〜10%下げると${saleSpeed}が現実的です。`;
  }
  return `現状は検索流入が弱めです。価格を相場下限付近に調整し、即日発送・付属品情報を追記して再生成してください。`;
}

export function formatBulkCopy(
  items: Array<{
    label: string;
    result: GenerateResult;
    insights: SeoInsights;
  }>,
): string {
  return items
    .map((item, i) => {
      const title = item.result.titles[0]?.title ?? "";
      return [
        `【${i + 1}】${item.label}`,
        `SEOスコア: ${item.insights.seoScore} / 予想売却: ${item.insights.saleSpeed}`,
        `タイトル: ${title}`,
        `キーワード: ${item.insights.keywords.map((k) => `#${k}`).join(" ")}`,
        "",
        item.result.description,
        "",
        item.result.hashtags.join(" "),
        "----------",
      ].join("\n");
    })
    .join("\n");
}
