import OpenAI from "openai";
import { generateLocally } from "./generate-local";
import type { GenerateResult, ProductInput, TitlePattern } from "./types";

const SYSTEM_PROMPT = `あなたは日本のフリマアプリ（メルカリ・ラクマ等）出品に強いコピーライターです。
与えられた商品情報から、SEOに強く、購買意欲を高め、トラブルを防ぐ出品文を日本語で作成してください。
必ず次のJSON形式のみを返してください（前後に説明文やコードフェンスを付けない）:
{
  "titles": [
    { "type": "seo", "label": "検索キーワード特化型", "title": "..." },
    { "type": "condition", "label": "美品・コンディション強調型", "title": "..." },
    { "type": "shipping", "label": "即日発送・お得感アピール型", "title": "..." }
  ],
  "description": "リッチな商品説明文（見出し付きのプレーンテキスト）",
  "hashtags": ["#タグ1", "#タグ2", "..."]
}

ルール:
- titles は必ず3件。各タイトルは40〜64文字程度。絵文字は最小限。
- description には次を含める:
  1) アイテム概要・魅力
  2) コンディション詳細
  3) 採寸・仕様のプレースホルダー（古着なら身幅/着丈、家電なら動作確認状況など）
  4) 発送方法・梱包の安心感
  5) トラブル防止・値引き交渉の注意書き
- hashtags は5〜8個。#付き。`;

function isValidResult(data: unknown): data is GenerateResult {
  if (!data || typeof data !== "object") return false;
  const obj = data as GenerateResult;
  return (
    Array.isArray(obj.titles) &&
    obj.titles.length === 3 &&
    typeof obj.description === "string" &&
    Array.isArray(obj.hashtags) &&
    obj.hashtags.length >= 5
  );
}

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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return generateLocally(input);
  }

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify(
            {
              category: input.category,
              brand: input.brand,
              productName: input.productName,
              condition: input.condition,
              size: input.size || null,
              color: input.color || null,
              notes: input.notes || null,
            },
            null,
            2,
          ),
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return generateLocally(input);

    const parsed = JSON.parse(raw) as GenerateResult;
    if (!isValidResult(parsed)) return generateLocally(input);

    return {
      titles: normalizeTitles(parsed.titles),
      description: parsed.description.trim(),
      hashtags: parsed.hashtags
        .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
        .slice(0, 8),
    };
  } catch {
    return generateLocally(input);
  }
}
