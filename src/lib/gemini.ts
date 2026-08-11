import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import {
  boostCommentsFromPatterns,
  buildLocalBoostPatterns,
  normalizeBoostPatterns,
  pickRecommendedBoostId,
} from "./boost-patterns";
import { detectProductKind } from "./buyer-benefits";
import { generateLocally } from "./generate-local";
import type { GenerateResult, ProductInput, TitlePattern } from "./types";
import {
  confirmedSeoCore,
  displayProductWithModel,
  hasModelForSeo,
  isModelNumberNone,
} from "./types";

const SYSTEM_PROMPT = `あなたは日本のフリマアプリ（メルカリ・ラクマ等）向けに、「修正不要でそのままコピペできる完成出品文」を書く専門コピーライターです。
出品者が手直しゼロで貼り付けられる完成度を最優先してください。汎用テンプレの使い回しは禁止です。

【確定情報の扱い】（最重要）
- brand / productName / modelNumber は出品者が確定した事実です。推測・書き換え・メーカー変更は禁止。
- modelNumberAbsent=true（型番が「なし」）の場合:
  - タイトル・本文に型番・品番を書かない（「型番なし」と強調しすぎない）。
  - 商品の特徴・実用性メリット・カテゴリ必須項目（サイズ／動作状態／残量）に特化したSEOタイトルにする。
- modelNumberAbsent=false の場合:
  - SEOタイトルは「メーカー名＋商品名＋型番」を核に構成する。
- identifiedBrand = 入力の brand、identifiedProduct = 商品名（型番があるときのみ併記可）。

【カテゴリ必須の織り込み】
- ファッション・古着: size をタイトル／本文に必ず反映。
- 家電・ガジェット: operationStatus（動作状態）を本文で明確に。
- コスメ・美容: remainingAmount（残量・使用回数）を本文で明確に。

【文章方針】（完成度100%・手直し不要）
- 購入者（使用者）が生活の中で得られるメリット・体験を中心に構成する。
- スペック羅列や傷の事実報告だけで終わらせない。
- 傷・汚れ・使用感は必ず「実用上問題ないこと」「その分お得であること」をポジティブにフォローする。
- conditionMemo は漏れなく自然な文章へ織り込む。
- 「写真をご確認ください」など写真前提の文言は使わない。

【販促ブースト】
boostPatterns は必ず次の3件（順序固定）:
1. id="value" … コスパ・お得感訴求
2. id="speed" … スピード・即効性訴求
3. id="trust" … 実用性・安心感訴求
このうちフリマSEO・成約率が最も高い1件だけ recommended=true。

ルール:
- titles は必ず3件。各40〜64文字。
- description は貼り付け可能な完成本文。
- hashtags は5〜8個。#付き。状態が悪い場合は #美品 を付けない。`;

const PRO_QUALITY_ADDON = `
【Sold Pro 最高品質モード】
購買心理を最大化する商品説明文を書くこと:
- 導入直後の生活シーンを具体描写（誰が・いつ・どう快適になるか）
- ベネフィット→証拠（確定情報・状態・メモ）→安心フォロー→今買う理由の流れ
- 煽りすぎず、信頼と欲求のバランスを取る
- 一般的なテンプレ表現を避け、この商品固有の言葉で書く`;

const listingSchema = z.object({
  identifiedBrand: z.string(),
  identifiedProduct: z.string(),
  productStrengths: z.array(z.string()).min(2).max(6),
  titles: z
    .array(
      z.object({
        type: z.enum(["seo", "condition", "shipping"]),
        label: z.string(),
        title: z.string(),
      }),
    )
    .length(3),
  description: z.string().min(1),
  boostPatterns: z
    .array(
      z.object({
        id: z.enum(["value", "speed", "trust"]),
        comment: z.string(),
        recommended: z.boolean(),
      }),
    )
    .length(3),
  hashtags: z.array(z.string()).min(5).max(8),
});

function normalizeTitles(
  titles: TitlePattern[],
  input: ProductInput,
): TitlePattern[] {
  const defaults: TitlePattern["type"][] = ["seo", "condition", "shipping"];
  const labels = [
    "検索キーワード特化型",
    "体験・ベネフィット強調型",
    "即日発送・お得感アピール型",
  ];
  const core = confirmedSeoCore(input);
  const useModel = hasModelForSeo(input.modelNumber);
  return titles.slice(0, 3).map((t, i) => {
    let title = String(t.title || "").slice(0, 80);
    if (!useModel) {
      title = title
        .replace(/\bなし\b/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }
    if (i === 0) {
      const needsCore =
        !title.includes(input.brand.trim()) ||
        !title.includes(input.productName.trim());
      const needsModel =
        useModel && !title.includes(input.modelNumber.trim());
      if (needsCore || needsModel) {
        title = `${core} ${title}`.replace(/\s+/g, " ").trim().slice(0, 64);
      }
    }
    return {
      type: t.type || defaults[i],
      label: t.label || labels[i],
      title,
    };
  });
}

function kindStrengths(input: ProductInput): string[] {
  const kind = detectProductKind(input);
  switch (kind) {
    case "circulator":
      return [
        "空気循環でエアコン効率アップ＆節電",
        "静音寄りで夜間・室内干しも快適",
        "風量調整でシーンに合わせて使える",
      ];
    case "gadget":
      return [
        "毎日の作業・エンタメがスムーズになる",
        "操作が分かりやすくすぐ使い始められる",
        "長く使える実用性が高い",
      ];
    case "fashion":
      return [
        "コーデの主役／脇役として合わせやすい",
        "着心地とシルエットのバランスが良い",
        "サイズ感が分かりやすく安心して選べる",
      ];
    case "cosmetics":
      return [
        "肌・髪のケアが続けやすい使い心地",
        "残量が明確でコスパ判断しやすい",
        "毎日のルーティンに取り入れやすい",
      ];
    default:
      return [
        "日常のストレスを減らす実用メリット",
        "届いたその日から使い始めやすい",
        "価格以上の満足感を感じやすいバランス",
      ];
  }
}

export type GenerateOptions = {
  trendSeo?: boolean;
  proCopyQuality?: boolean;
};

export async function generateListing(
  input: ProductInput,
  options: GenerateOptions = {},
): Promise<GenerateResult> {
  const brand = input.brand.trim();
  const productName = input.productName.trim();
  const modelNumber = input.modelNumber.trim();
  const modelAbsent = isModelNumberNone(modelNumber);
  const productLabel = displayProductWithModel({ productName, modelNumber });
  const enriched: ProductInput = {
    ...input,
    brand,
    productName,
    modelNumber,
  };
  const strengths = kindStrengths(enriched);
  const localBoosts = buildLocalBoostPatterns(enriched);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return generateLocally(enriched, options);
  }

  try {
    const google = createGoogleGenerativeAI({ apiKey });
    let system = SYSTEM_PROMPT;
    if (options.proCopyQuality) {
      system = `${system}\n${PRO_QUALITY_ADDON}`;
    }
    if (options.trendSeo) {
      system = `${system}\n\n【プレミアム特典: トレンドSEO自動適用】\n即日発送/匿名配送/正規品/希少 等を、購入者が『今買う理由』として自然に感じる形で織り込む。`;
    }

    const { object } = await generateObject({
      model: google("gemini-2.0-flash"),
      schema: listingSchema,
      system,
      prompt: JSON.stringify(
        {
          category: enriched.category,
          brand,
          productName,
          modelNumber: modelAbsent ? null : modelNumber,
          modelNumberAbsent: modelAbsent,
          seoCoreMustInclude: confirmedSeoCore(enriched),
          knownStrengths: strengths,
          condition: enriched.condition,
          conditionMemo: enriched.conditionMemo || null,
          size: enriched.size || null,
          operationStatus: enriched.operationStatus || null,
          remainingAmount: enriched.remainingAmount || null,
          color: enriched.color || null,
          notes: enriched.notes || null,
          writingFocus: modelAbsent
            ? "型番SEO禁止。特徴・実用メリット・カテゴリ必須項目を軸に検索に強いタイトルと本文を書く。"
            : options.proCopyQuality
              ? "Sold Pro最高品質: 購買心理を最大化。メーカー・商品名・型番は確定情報として正確に使用。"
              : "メーカー・商品名・型番は確定情報。生活メリット中心の手直し不要な完成文。",
          conditionInstruction:
            enriched.condition === "傷や汚れあり"
              ? "コンディションは『傷や汚れあり（使用感あり）』と明記。美品表現禁止。実用上問題ない点とその分お得であることを必ずフォロー。conditionMemoを織り込む。"
              : enriched.condition === "やや傷や汚れあり"
                ? "軽度の使用感を正直に書き、日常使いには支障がない安心材料とお得感を添える。conditionMemoを織り込む。"
                : "コンディションは入力に忠実に。すぐ使える安心感を添える。conditionMemoを自然に織り込む。",
          boostPatternBrief: {
            value: "コスパ・お得感（価格対効果・今が買い時）",
            speed: "スピード・即効性（発送の速さ・今すぐ欲しい）",
            trust: "実用性・安心感（動作確認・傷の実用フォロー）",
          },
          copyPasteReady: true,
          premiumTrendSeo: Boolean(options.trendSeo),
          proCopyQuality: Boolean(options.proCopyQuality),
        },
        null,
        2,
      ),
      temperature: options.proCopyQuality ? 0.7 : 0.65,
    });

    const boostPatterns = normalizeBoostPatterns(
      object.boostPatterns,
      localBoosts,
    );
    const recommendedBoostId = pickRecommendedBoostId(boostPatterns);

    return {
      identifiedBrand: brand,
      identifiedProduct: object.identifiedProduct.trim() || productLabel,
      productStrengths:
        object.productStrengths.length > 0
          ? object.productStrengths
          : strengths,
      boostPatterns,
      recommendedBoostId,
      boostComments: boostCommentsFromPatterns(boostPatterns),
      titles: normalizeTitles(object.titles, enriched),
      description: object.description.trim(),
      hashtags: object.hashtags
        .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
        .slice(0, 8),
    };
  } catch {
    return generateLocally(enriched, options);
  }
}
