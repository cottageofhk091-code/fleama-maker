export const CATEGORIES = [
  "家電・ガジェット",
  "ファッション・古着",
  "コスメ・美容",
  "その他",
] as const;

export const CONDITIONS = [
  "新品未使用",
  "未使用に近い",
  "目立った傷や汚れなし",
  "やや傷や汚れあり",
  "傷や汚れあり",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type Condition = (typeof CONDITIONS)[number];

export type CategoryExtraField =
  | "size"
  | "operationStatus"
  | "remainingAmount";

export type ProductInput = {
  category: Category;
  /** メーカー・ブランド（必須・ユーザー確定） */
  brand: string;
  /** 商品名（必須・ユーザー確定） */
  productName: string;
  /**
   * 型番・品番（必須）。型番が無い場合は「なし」と入力。
   */
  modelNumber: string;
  condition: Condition;
  /** コンディション・アピール詳細 */
  conditionMemo?: string;
  /** ファッション・古着で必須 */
  size?: string;
  /** 家電・ガジェットで必須（動作状態） */
  operationStatus?: string;
  /** コスメ・美容で必須（残量・使用回数） */
  remainingAmount?: string;
  color?: string;
  notes?: string;
};

export type TitlePattern = {
  type: "seo" | "condition" | "shipping";
  label: string;
  title: string;
};

export type BoostPatternId = "value" | "speed" | "trust";

export type BoostPattern = {
  id: BoostPatternId;
  label: string;
  angle: string;
  comment: string;
  recommended: boolean;
};

export type GenerateResult = {
  titles: TitlePattern[];
  description: string;
  hashtags: string[];
  identifiedBrand?: string;
  identifiedProduct?: string;
  productStrengths?: string[];
  boostComments?: string[];
  boostPatterns?: BoostPattern[];
  recommendedBoostId?: BoostPatternId;
};

export type ContactPayload = {
  name: string;
  email: string;
  subject?: string;
  message: string;
  kind?: string;
};

/** 型番が「なし」系か（SEO型番をスキップ） */
export function isModelNumberNone(modelNumber?: string | null): boolean {
  const m = (modelNumber ?? "").trim();
  if (!m) return false;
  return /^(なし|無し|無|n\/?a|none|なしです|型番なし|品番なし|-|－|ー)$/i.test(
    m,
  );
}

/** 型番をSEOに使うか */
export function hasModelForSeo(modelNumber?: string | null): boolean {
  const m = (modelNumber ?? "").trim();
  return Boolean(m) && !isModelNumberNone(m);
}

/** カテゴリに応じた追加必須フィールド */
export function categoryExtraField(
  category: Category,
): CategoryExtraField | null {
  if (category === "ファッション・古着") return "size";
  if (category === "家電・ガジェット") return "operationStatus";
  if (category === "コスメ・美容") return "remainingAmount";
  return null;
}

export function categoryExtraMeta(field: CategoryExtraField): {
  label: string;
  placeholder: string;
  hint: string;
} {
  switch (field) {
    case "size":
      return {
        label: "サイズ",
        placeholder: "例: M、L、着丈◯cm",
        hint: "ファッション出品ではサイズが検索・安心感の要です",
      };
    case "operationStatus":
      return {
        label: "動作状態",
        placeholder: "例: 動作良好、一部難あり",
        hint: "家電は動作状態の明記が成約率に直結します",
      };
    case "remainingAmount":
      return {
        label: "残量・使用回数",
        placeholder: "例: 9割残、未使用",
        hint: "コスメは残量・使用回数が必須の判断材料です",
      };
  }
}

export function hasCategoryExtraFilled(input: {
  category: Category;
  size?: string | null;
  operationStatus?: string | null;
  remainingAmount?: string | null;
}): boolean {
  const field = categoryExtraField(input.category);
  if (!field) return true;
  if (field === "size") return Boolean(input.size?.trim());
  if (field === "operationStatus") return Boolean(input.operationStatus?.trim());
  return Boolean(input.remainingAmount?.trim());
}

/** 3大必須が揃っているか（型番は「なし」も可） */
export function hasRequiredProductIdentity(input: {
  brand?: string | null;
  productName?: string | null;
  modelNumber?: string | null;
}): boolean {
  return Boolean(
    input.brand?.trim() &&
      input.productName?.trim() &&
      input.modelNumber?.trim(),
  );
}

/** 生成可能な全必須が揃っているか */
export function canSubmitProductInput(input: {
  category: Category;
  brand?: string | null;
  productName?: string | null;
  modelNumber?: string | null;
  size?: string | null;
  operationStatus?: string | null;
  remainingAmount?: string | null;
}): boolean {
  return (
    hasRequiredProductIdentity(input) && hasCategoryExtraFilled(input)
  );
}

/** SEOタイトル用の確定キーワード並び（型番なし時は型番を除外） */
export function confirmedSeoCore(input: {
  brand: string;
  productName: string;
  modelNumber: string;
}): string {
  const brand = input.brand.trim();
  const name = input.productName.trim();
  if (!hasModelForSeo(input.modelNumber)) {
    return `${brand} ${name}`.replace(/\s+/g, " ").trim();
  }
  return `${brand} ${name} ${input.modelNumber.trim()}`
    .replace(/\s+/g, " ")
    .trim();
}

export function displayProductWithModel(input: {
  productName: string;
  modelNumber: string;
}): string {
  const name = input.productName.trim();
  if (!hasModelForSeo(input.modelNumber)) return name;
  const model = input.modelNumber.trim();
  if (name.toLowerCase().includes(model.toLowerCase())) return name;
  return `${name} ${model}`.trim();
}
