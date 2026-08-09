import type { GenerateResult, ProductInput } from "./types";

function cleanPart(value?: string): string {
  return (value ?? "").trim();
}

function conditionKeyword(condition: string): string {
  if (condition.includes("新品")) return "新品";
  if (condition.includes("未使用に近い")) return "美品";
  if (condition.includes("目立った傷や汚れなし")) return "美品";
  if (condition.includes("やや傷")) return "良品";
  return "現状品";
}

function categoryKeywords(category: string): string[] {
  switch (category) {
    case "古着・ファッション":
      return ["古着", "ファッション", "コーデ"];
    case "家電・ガジェット":
      return ["家電", "ガジェット", "動作確認済"];
    case "本・ゲーム":
      return ["本", "ゲーム", "コレクション"];
    case "インテリア・雑貨":
      return ["インテリア", "雑貨", "おしゃれ"];
    default:
      return ["フリマ", "おすすめ"];
  }
}

/**
 * Deterministic local generator used when GEMINI_API_KEY is absent,
 * or as a fallback if the OpenAI call fails.
 */
export function generateLocally(input: ProductInput): GenerateResult {
  const brand = cleanPart(input.brand) || "ブランド";
  const product = cleanPart(input.productName) || "商品";
  const condition = cleanPart(input.condition);
  const size = cleanPart(input.size);
  const color = cleanPart(input.color);
  const notes = cleanPart(input.notes);
  const condKey = conditionKeyword(condition);
  const catKeys = categoryKeywords(input.category);

  const sizeColor = [size && `サイズ${size}`, color && color]
    .filter(Boolean)
    .join(" ");

  const titles = [
    {
      type: "seo" as const,
      label: "検索キーワード特化型",
      title: [
        brand,
        product,
        sizeColor,
        condition,
        catKeys[0],
        "送料込可",
      ]
        .filter(Boolean)
        .join(" ")
        .slice(0, 64),
    },
    {
      type: "condition" as const,
      label: "美品・コンディション強調型",
      title: [
        `【${condKey}】`,
        brand,
        product,
        size && `Size ${size}`,
        color,
        "丁寧に保管",
      ]
        .filter(Boolean)
        .join(" ")
        .slice(0, 64),
    },
    {
      type: "shipping" as const,
      label: "即日発送・お得感アピール型",
      title: [
        "【即日発送】",
        brand,
        product,
        condKey,
        "お買い得",
        notes?.includes("即日") ? "本日発送" : "迅速対応",
      ]
        .filter(Boolean)
        .join(" ")
        .slice(0, 64),
    },
  ];

  const measurePlaceholder =
    input.category === "古着・ファッション"
      ? `【採寸・仕様】
・身幅：○○ cm
・着丈：○○ cm
・袖丈：○○ cm
・素材：○○
※実寸は実測値です。多少の誤差はご了承ください。`
      : input.category === "家電・ガジェット"
        ? `【仕様・動作確認】
・型番：${product}
・電源/起動：確認済（要記入）
・付属品：○○
・付属品以外の付属物はありません。`
        : `【仕様】
・サイズ：${size || "○○"}
・カラー：${color || "○○"}
・その他仕様：○○`;

  const description = `【アイテム概要・魅力】
${brand}の「${product}」です。
${catKeys.join("・")}好きの方におすすめの一品。
${notes ? `特記事項：${notes}` : "ご自宅での保管状態も良好で、すぐにご活用いただけます。"}
購買意欲を刺激するポイントとして、ブランドらしさと実用性のバランスが魅力です。

【コンディション詳細】
状態：${condition}
${condKey === "新品" ? "タグ付き/未使用の可能性が高い商品です。開封済みの場合は記載内容をご確認ください。" : ""}
${condKey === "美品" ? "目立った傷・汚れは少なく、きれいなコンディションです。" : ""}
${condKey === "良品" || condKey === "現状品" ? "使用感はありますが、まだまだご愛用いただけます。写真もあわせてご確認ください。" : ""}
カラー：${color || "（記載なし）"} ／ サイズ：${size || "（記載なし）"}

${measurePlaceholder}

【発送・梱包について】
・丁寧に梱包し、配送中の破損・汚れを防ぐよう心がけます
・基本的に迅速対応（${notes?.includes("即日") ? "即日発送可能" : "可能な限り早めに発送"}）
・匿名配送にも対応可能です（取引メッセージでご相談ください）

【ご購入前のお願い・注意書き】
・値下げ交渉はお気軽にどうぞ。ただし過度な値引き・連投はご遠慮ください
・色味はモニター環境により実物と異なる場合があります
・個人間売買のため返品・返金は原則不可です（初期不良時はご連絡ください）
・質問があればお気軽にコメントください。気持ちの良い取引を心がけております`;

  const hashtags = Array.from(
    new Set(
      [
        `#${brand.replace(/\s+/g, "")}`,
        `#${product.replace(/\s+/g, "").slice(0, 20)}`,
        `#${catKeys[0]}`,
        `#フリマ`,
        `#メルカリ`,
        condKey === "新品" ? "#新品" : "#美品",
        "#即日発送",
        size ? `#サイズ${size}` : "#お得",
        color ? `#${color}` : null,
      ].filter(Boolean) as string[],
    ),
  ).slice(0, 8);

  return { titles, description, hashtags };
}
