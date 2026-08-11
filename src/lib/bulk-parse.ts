import {
  CATEGORIES,
  CONDITIONS,
  canSubmitProductInput,
  type Category,
  type Condition,
  type ProductInput,
} from "@/lib/types";
import { PRO_BULK_MAX_ITEMS } from "@/lib/billing";
import { detectCondition } from "@/lib/condition";

export type BulkDraftItem = {
  id: string;
  brand: string;
  productName: string;
  modelNumber: string;
  category: Category;
  conditionMemo: string;
  condition: Condition;
  size?: string;
  operationStatus?: string;
  remainingAmount?: string;
  input: ProductInput | null;
  parseError?: string;
};

function detectCategory(text: string): Category {
  const lower = text.toLowerCase();
  if (/コスメ|美容|スキンケア|化粧水|ファンデーション/.test(lower)) {
    return "コスメ・美容";
  }
  if (
    /iphone|ipad|sony|airpods|カメラ|家電|ガジェット|pc|スマホ|apple|サーキュ|扇風機|除湿|掃除機|アイリス/.test(
      lower,
    )
  ) {
    return "家電・ガジェット";
  }
  if (/服|シャツ|パンツ|古着|fashion|nike|uniqlo|zara|dunk/.test(lower)) {
    return "ファッション・古着";
  }
  return CATEGORIES[CATEGORIES.length - 1];
}

export function buildProductInputFromFields(fields: {
  brand: string;
  productName: string;
  modelNumber: string;
  category?: Category;
  conditionMemo?: string;
  condition?: Condition;
  size?: string;
  operationStatus?: string;
  remainingAmount?: string;
}): ProductInput | null {
  const brand = fields.brand.trim();
  const productName = fields.productName.trim();
  const modelNumber = fields.modelNumber.trim();
  if (!brand || !productName || !modelNumber) return null;

  const memo = fields.conditionMemo?.trim() || "";
  const condition =
    fields.condition &&
    (CONDITIONS as readonly string[]).includes(fields.condition)
      ? fields.condition
      : memo
        ? detectCondition(memo)
        : "目立った傷や汚れなし";

  const category =
    fields.category &&
    (CATEGORIES as readonly string[]).includes(fields.category)
      ? fields.category
      : detectCategory(`${brand} ${productName} ${modelNumber} ${memo}`);

  const input: ProductInput = {
    category,
    brand,
    productName,
    modelNumber,
    condition,
    conditionMemo: memo || undefined,
    notes: memo || undefined,
    size: fields.size?.trim() || undefined,
    operationStatus: fields.operationStatus?.trim() || undefined,
    remainingAmount: fields.remainingAmount?.trim() || undefined,
  };

  if (!canSubmitProductInput(input)) return null;
  return input;
}

/** @deprecated Legacy memo parser */
export function buildProductInput(
  productMemo: string,
  conditionMemo: string,
  extraNotes?: string,
): ProductInput | null {
  const line = productMemo.trim();
  if (!line) return null;
  const tokens = line.split(/[\s、,／/|]+/).filter(Boolean);
  const brand = tokens[0] || "";
  const modelCandidate =
    tokens.find((t) => /[A-Za-z]*\d+[A-Za-z0-9-]*/.test(t)) ||
    tokens.at(-1) ||
    "なし";
  const productName =
    tokens
      .filter((t) => t !== brand && t !== modelCandidate)
      .join(" ") || tokens[1] || brand;
  return buildProductInputFromFields({
    brand,
    productName,
    modelNumber: modelCandidate,
    conditionMemo: [conditionMemo, extraNotes].filter(Boolean).join("\n"),
  });
}

export function rowsToDraftItems(
  rows: Array<{
    id: string;
    brand: string;
    productName: string;
    modelNumber: string;
    category: Category;
    conditionMemo: string;
    condition?: Condition;
    size?: string;
    operationStatus?: string;
    remainingAmount?: string;
  }>,
): BulkDraftItem[] {
  return rows
    .filter(
      (r) =>
        r.brand.trim() ||
        r.productName.trim() ||
        r.modelNumber.trim() ||
        r.conditionMemo.trim(),
    )
    .slice(0, PRO_BULK_MAX_ITEMS)
    .map((r) => {
      const input = buildProductInputFromFields(r);
      return {
        id: r.id,
        brand: r.brand,
        productName: r.productName,
        modelNumber: r.modelNumber,
        category: r.category,
        conditionMemo: r.conditionMemo,
        condition: input?.condition ?? r.condition ?? "目立った傷や汚れなし",
        size: r.size,
        operationStatus: r.operationStatus,
        remainingAmount: r.remainingAmount,
        input,
        parseError: input
          ? undefined
          : "メーカー・商品名・型番とカテゴリ必須項目を入力してください",
      };
    });
}

export function validateBulkInputs(items: BulkDraftItem[]): string | null {
  if (items.length === 0) {
    return "1件以上、メーカー・商品名・型番を入力してください。";
  }
  if (items.length > PRO_BULK_MAX_ITEMS) {
    return `一度に生成できるのは最大${PRO_BULK_MAX_ITEMS}件です。`;
  }
  const incomplete = items.find((i) => !i.input);
  if (incomplete) {
    return "各行でメーカー・商品名・型番、およびカテゴリ別の必須項目が必要です。";
  }
  return null;
}
