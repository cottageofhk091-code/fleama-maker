import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject, type LanguageModel } from "ai";
import { z } from "zod";
import {
  lookupLocalModelVariants,
  type GadgetProductCandidate,
  type ModelLookupResult,
} from "@/lib/gadget-models";
import {
  estimateModelVariants,
  extractCodeHint,
} from "@/lib/model-estimate";

export { estimateModelVariants, extractCodeHint } from "@/lib/model-estimate";

export const MODEL_LOOKUP_SYSTEM_PROMPT = `あなたはフリマ出品支援のための型番・品番・商品名解釈エンジンです。
固定カタログに依存せず、入力テキストをAIとして直接解釈し、該当する（あるいは非常に近い）商品名・スペックバリエーションの配列を動的に生成してください。

【必須】
入力された型番（例: サーキュレーター、生活家電、ガジェット、Amazon限定品番、メーカー品番など）や「PCF-SC15T サーキュレーター」のような複合テキストから、メーカー・製品カテゴリ・主要機能（風量・静音性・畳数、容量、カラー、サイズなど）を特定・補完してください。バリエーション（カラー・サイズなど）が考えられる場合は、選択肢候補としてリスト化してください。

【方針】
- 入力テキストに含まれる型番文字列は必ず尊重し、候補名に残す。
- Amazon限定型番・家電品番・ガジェット型番・自由記述の商品名など、あらゆる形式に対応する。
- 断定できない場合でも「推定候補」として必ず1件以上返す（0件禁止・「見つかりません」禁止）。
- 候補は日本のフリマで使いやすい商品名表記（メーカー名＋製品名＋主要スペック）。
- candidates は最低1件、最大8件。`;

const lookupSchema = z.object({
  brand: z.string().describe("メーカー名（推定可）"),
  categoryHint: z.enum([
    "家電・ガジェット",
    "ファッション・古着",
    "コスメ・美容",
    "その他",
  ]),
  productBaseName: z.string().describe("代表的な製品名（解釈結果）"),
  keyFeatures: z
    .array(z.string())
    .max(8)
    .describe("主要機能・スペック要点"),
  candidates: z
    .array(
      z.object({
        name: z.string(),
        storage: z.string().nullable().optional(),
        connectivity: z.string().nullable().optional(),
        color: z.string().nullable().optional(),
        generation: z.string().nullable().optional(),
        size: z.string().nullable().optional(),
      }),
    )
    .min(1)
    .max(8),
});

function mapCategory(hint: string): ModelLookupResult["categoryHint"] {
  if (
    hint === "家電・ガジェット" ||
    hint === "ファッション・古着" ||
    hint === "コスメ・美容" ||
    hint === "その他"
  ) {
    return hint;
  }
  if (hint === "古着・ファッション") return "ファッション・古着";
  if (hint === "インテリア・雑貨" || hint === "本・ゲーム") return "その他";
  return "家電・ガジェット";
}

function pickModel(): LanguageModel | null {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return createOpenAI({ apiKey: openaiKey })("gpt-4o");
  }
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    return createGoogleGenerativeAI({ apiKey: geminiKey })("gemini-2.0-flash");
  }
  return null;
}

function ensureCandidates(
  result: ModelLookupResult,
  rawQuery: string,
): ModelLookupResult {
  if (result.candidates?.length >= 1) return result;
  return estimateModelVariants(result.modelId || extractCodeHint(rawQuery), rawQuery);
}

async function lookupWithAi(
  rawQuery: string,
  modelId: string,
): Promise<ModelLookupResult> {
  const model = pickModel();
  if (!model) {
    throw new Error("NO_API_KEY");
  }

  const { object } = await generateObject({
    model,
    schema: lookupSchema,
    system: MODEL_LOOKUP_SYSTEM_PROMPT,
    prompt: [
      `入力テキスト: ${rawQuery}`,
      `正規化キー: ${modelId}`,
      "メーカー・カテゴリ・主要機能を推定し、商品バリエーション候補を必ず1件以上JSONで返してください。",
      "入力に含まれる型番は候補名に残してください。0件や『見つかりません』は禁止です。",
    ].join("\n"),
    temperature: 0.35,
  });

  const candidates: GadgetProductCandidate[] = object.candidates
    .filter((c) => c.name?.trim())
    .map((c, i) => ({
      id: `ai-${modelId}-${i}`,
      name: c.name.trim(),
      storage: c.storage ?? undefined,
      connectivity: c.connectivity ?? undefined,
      color: c.color ?? undefined,
      generation: c.generation ?? c.size ?? undefined,
    }));

  return ensureCandidates(
    {
      modelId,
      brand: object.brand || "メーカー推定",
      categoryHint: mapCategory(object.categoryHint),
      productBaseName:
        object.productBaseName ||
        `${object.brand} ${modelId}`.trim() ||
        `型番 ${modelId}`,
      candidates,
      source: "ai",
    },
    rawQuery,
  );
}

/**
 * AI-first text lookup. Always returns ≥1 candidate for non-empty input.
 * Never throws "候補が見つかりません".
 */
export async function lookupModelVariants(
  query: string,
): Promise<ModelLookupResult> {
  const raw = query.trim();
  if (!raw) {
    throw new Error(
      "型番・商品名を入力してください（例: PCF-SC15T サーキュレーター / A2588）",
    );
  }

  const modelId = extractCodeHint(raw);

  try {
    return await lookupWithAi(raw, modelId);
  } catch {
    // AI / network / schema failure → catalog then guaranteed estimate
    const local = lookupLocalModelVariants(modelId);
    if (local?.candidates.length) return local;
    return estimateModelVariants(modelId, raw);
  }
}
