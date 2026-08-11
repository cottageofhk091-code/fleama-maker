import type { GenerateResult, ProductInput } from "./types";
import {
  confirmedSeoCore,
  displayProductWithModel,
  hasModelForSeo,
} from "./types";
import {
  boostCommentsFromPatterns,
  buildLocalBoostPatterns,
  pickRecommendedBoostId,
} from "./boost-patterns";
import { conditionBodyCopy, conditionDisplayLabel } from "./condition";
import { buyerBenefitLead, detectProductKind } from "./buyer-benefits";

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
    case "ファッション・古着":
      return ["古着", "ファッション", "コーデ"];
    case "家電・ガジェット":
      return ["家電", "ガジェット", "動作確認済"];
    case "コスメ・美容":
      return ["コスメ", "美容", "スキンケア"];
    default:
      return ["フリマ", "おすすめ"];
  }
}

function strengthsFor(input: ProductInput): string[] {
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

export function generateLocally(
  input: ProductInput,
  options: { trendSeo?: boolean; proCopyQuality?: boolean } = {},
): GenerateResult {
  const brand = input.brand.trim();
  const productName = input.productName.trim();
  const modelNumber = input.modelNumber.trim();
  const useModel = hasModelForSeo(modelNumber);
  const product = displayProductWithModel({ productName, modelNumber });
  const seoCore = confirmedSeoCore({ brand, productName, modelNumber });
  const strengths = strengthsFor(input);
  const size = cleanPart(input.size);
  const operationStatus = cleanPart(input.operationStatus);
  const remainingAmount = cleanPart(input.remainingAmount);
  const color = cleanPart(input.color);
  const notes = cleanPart(input.notes || input.conditionMemo);
  const condKey = conditionKeyword(input.condition);
  const catKeys = categoryKeywords(input.category);
  const conditionLabel = conditionDisplayLabel(
    input.condition,
    input.conditionMemo,
  );
  const trendBits = options.trendSeo
    ? ["匿名配送可", "即日発送", "人気上昇中"]
    : [];

  const extraTitleBit =
    size ||
    operationStatus?.slice(0, 10) ||
    remainingAmount?.slice(0, 10) ||
    strengths[0]?.slice(0, 12);

  const titles = [
    {
      type: "seo" as const,
      label: "検索キーワード特化型",
      title: [seoCore, size && `サイズ${size}`, extraTitleBit, ...trendBits.slice(0, 1)]
        .filter(Boolean)
        .join(" ")
        .slice(0, 64),
    },
    {
      type: "condition" as const,
      label: "体験・ベネフィット強調型",
      title: [
        brand,
        productName,
        useModel ? modelNumber : null,
        strengths[1]?.slice(0, 14) || "生活がラクになる",
        condKey === "現状品" || condKey === "良品"
          ? "お得に始められる"
          : "すぐ使える",
      ]
        .filter(Boolean)
        .join(" ")
        .slice(0, 64),
    },
    {
      type: "shipping" as const,
      label: "即日発送・お得感アピール型",
      title: ["【即日発送】", seoCore, condKey, "お買い得", ...trendBits.slice(1, 2)]
        .filter(Boolean)
        .join(" ")
        .slice(0, 64),
    },
  ];

  const categoryExtraBlock =
    input.category === "ファッション・古着"
      ? `【サイズ】\n・${size || "（要確認）"}`
      : input.category === "家電・ガジェット"
        ? `【動作状態】\n・${operationStatus || "（要確認）"}
・メーカー：${brand}
・商品名：${productName}
${useModel ? `・型番：${modelNumber}` : "・型番：記載なし（特徴・実用性でご案内）"}`
        : input.category === "コスメ・美容"
          ? `【残量・使用回数】\n・${remainingAmount || "（要確認）"}`
          : `【仕様】
・メーカー：${brand}
・商品名：${productName}
${useModel ? `・型番：${modelNumber}` : ""}
・サイズ：${size || "○○"}
・カラー：${color || "○○"}`;

  const benefitLead = buyerBenefitLead({
    ...input,
    brand,
    productName: product,
  });

  const strengthLines = strengths.map((s) => `・${s}`).join("\n");
  const proLead = options.proCopyQuality
    ? `\n${brand}の${productName}${useModel ? `（型番 ${modelNumber}）` : ""}は、毎日のシーンで『ちょっと快適』が積み重なる一点です。\n`
    : "";

  const description = `【こんな体験が待っています】
${proLead}${benefitLead}
${notes ? `特記：${notes}` : ""}

【この商品ならではの強み】
${strengthLines}

【確定スペック】
・メーカー：${brand}
・商品名：${productName}
${useModel ? `・型番：${modelNumber}` : "・型番：なし（特徴・実用メリット中心のご案内）"}
${size ? `・サイズ：${size}` : ""}
${operationStatus ? `・動作状態：${operationStatus}` : ""}
${remainingAmount ? `・残量・使用回数：${remainingAmount}` : ""}

【コンディションと安心】
状態：${conditionLabel}
${conditionBodyCopy(input.condition, input.conditionMemo)}
カラー：${color || "（記載なし）"}

${categoryExtraBlock}

【発送・梱包について】
・丁寧に梱包し、届いたその日から安心して使い始められるよう心がけます
・基本的に迅速対応（${notes?.includes("即日") || notes?.includes("24時間") ? "即日／24時間以内発送可能" : "可能な限り早めに発送"}）
・匿名配送にも対応可能です

【ご購入前のお願い】
・値下げ交渉はお気軽にどうぞ（過度な連投はご遠慮ください）
・色味はモニターにより異なる場合があります
・個人間売買のため返品は原則不可です（初期不良時はご連絡ください）`;

  const conditionTag =
    condKey === "新品"
      ? "#新品"
      : condKey === "美品"
        ? "#美品"
        : condKey === "良品"
          ? "#使用感あり"
          : "#現状品";

  const hashtags = Array.from(
    new Set(
      [
        `#${brand.replace(/\s+/g, "")}`,
        `#${productName.replace(/\s+/g, "").slice(0, 20)}`,
        useModel ? `#${modelNumber.replace(/\s+/g, "")}` : null,
        size ? `#サイズ${size.replace(/\s+/g, "")}` : null,
        `#${catKeys[0]}`,
        `#フリマ`,
        `#メルカリ`,
        conditionTag,
        "#即日発送",
      ].filter(Boolean) as string[],
    ),
  ).slice(0, 8);

  const boostPatterns = buildLocalBoostPatterns({
    ...input,
    brand,
    productName,
    modelNumber,
  });

  return {
    identifiedBrand: brand,
    identifiedProduct: product,
    productStrengths: strengths,
    boostPatterns,
    recommendedBoostId: pickRecommendedBoostId(boostPatterns),
    boostComments: boostCommentsFromPatterns(boostPatterns),
    titles,
    description,
    hashtags,
  };
}
