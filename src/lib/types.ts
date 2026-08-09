export const CATEGORIES = [
  "古着・ファッション",
  "家電・ガジェット",
  "本・ゲーム",
  "インテリア・雑貨",
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

export type ProductInput = {
  category: Category;
  brand: string;
  productName: string;
  condition: Condition;
  size?: string;
  color?: string;
  notes?: string;
};

export type TitlePattern = {
  type: "seo" | "condition" | "shipping";
  label: string;
  title: string;
};

export type GenerateResult = {
  titles: TitlePattern[];
  description: string;
  hashtags: string[];
};

export type ContactPayload = {
  name: string;
  email: string;
  message: string;
};
