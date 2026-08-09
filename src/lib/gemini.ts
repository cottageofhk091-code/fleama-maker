import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { generateLocally } from "./generate-local";
import type { GenerateResult, ProductInput, TitlePattern } from "./types";

const SYSTEM_PROMPT = `あなたは日本のフリマアプリ（メルカリ・ラクマ等）出品に強いコピーライターです。
与えられた商品情報から、SEOに強く、購買意欲を高め、トラブルを防ぐ出品文を日本語で作成してください。

ルール:
- titles は必ず3件。各タイトルは40〜64文字程度。絵文字は最小限。
- description には次を含める:
  1) アイテム概要・魅力
  2) コンディション詳細
  3) 採寸・仕様のプレースホルダー（古着なら身幅/着丈、家電なら動作確認状況など）
  4) 発送方法・梱包の安心感
  5) トラブル防止・値引き交渉の注意書き
- hashtags は5〜8個。#付き。`;

const listingSchema = z.object({
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
  hashtags: z.array(z.string()).min(5).max(8),
});

function normalizeTitles(titles: TitlePattern[]): TitlePattern[] {
  const defaults: TitlePattern["type"][] = ["seo", "condition", "shipping"];
  const labels = [
    "検索キーワード特化型",
    "美品・コンディション強調型",
    "即日発送・お得感アピール型",
  ];
  return titles.slice(0, 3).map((t, i) => ({
    type: t.type || defaults[i],
    label: t.label || labels[i],
    title: String(t.title || "").slice(0, 80),
  }));
}

export async function generateListing(
  input: ProductInput,
): Promise<GenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return generateLocally(input);
  }

  try {
    const google = createGoogleGenerativeAI({ apiKey });
    const { object } = await generateObject({
      model: google("gemini-2.0-flash"),
      schema: listingSchema,
      system: SYSTEM_PROMPT,
      prompt: JSON.stringify(
        {
          category: input.category,
          brand: input.brand,
          productName: input.productName,
          condition: input.condition,
          size: input.size || null,
          color: input.color || null,
          notes: input.notes || null,
          titlePatterns: [
            {
              type: "seo",
              label: "検索キーワード特化型",
              hint: "ブランド名+型番+状態+キーワード",
            },
            {
              type: "condition",
              label: "美品・コンディション強調型",
              hint: "美品・コンディションを前面に",
            },
            {
              type: "shipping",
              label: "即日発送・お得感アピール型",
              hint: "即日発送・お得感をアピール",
            },
          ],
        },
        null,
        2,
      ),
      temperature: 0.7,
    });

    return {
      titles: normalizeTitles(object.titles),
      description: object.description.trim(),
      hashtags: object.hashtags
        .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
        .slice(0, 8),
    };
  } catch {
    return generateLocally(input);
  }
}
