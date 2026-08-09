export const SITE_NAME = "フリマリスト Sold";
export const SITE_SHORT_NAME = "フリマリスト";
export const SITE_TAGLINE = "一発で売れる！検索最適化の出品アシスタントAI";
export const SITE_DESCRIPTION =
  "一発で売れる！検索最適化の出品アシスタントAI。商品情報からSEOタイトル・売れる説明文・ハッシュタグを生成します。";

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
} as const;
