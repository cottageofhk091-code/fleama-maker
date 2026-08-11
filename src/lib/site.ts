export const SITE_NAME = "フリマリスト Sold";
export const SITE_SHORT_NAME = "フリマリスト";
export const SITE_TAGLINE =
  "正確な情報入力 → 修正不要で即コピペできる完璧な出品文を一発生成";
export const SITE_DESCRIPTION =
  "型番・状態・コンディションを正確に入力するだけで、購入者メリット中心の出品文を修正不要で一発生成。ワンタップでコピペできます。";

/** 法務ページ用の運営情報（後から差し替えやすい） */
export const LEGAL = {
  serviceName: SITE_NAME,
  sellerName: "Nomad Flow Lab",
  operatorName: "Hiroki Matsushita",
  addressAndPhone:
    "請求があったら遅滞なく開示します（※フォームよりお問い合わせください）",
  contactMethod: "本サイトのお問い合わせフォームよりご連絡ください",
  contactPath: "/contact",
  accountPath: "/account",
  paymentMethod: "クレジットカード決済（Stripe）",
  aiProviders: "OpenAI / Google Gemini 等",
  paymentProvider: "Stripe",
  lastUpdated: "2026年8月11日",
} as const;

/** Brand assets under /public */
export const siteAssets = {
  faviconIco: "/favicon.ico",
  faviconPng: "/favicon.png",
  iconX: "/icon-x.png",
  headerX: "/header-x.png",
  headerNote: "/header-note.png",
  ogImage: "/header-note.png",
} as const;

export const siteConfig = {
  name: SITE_NAME,
  shortName: SITE_SHORT_NAME,
  tagline: SITE_TAGLINE,
  description: SITE_DESCRIPTION,
  assets: siteAssets,
  legal: LEGAL,
} as const;
