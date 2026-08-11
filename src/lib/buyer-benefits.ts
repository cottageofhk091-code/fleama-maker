import type { Category, ProductInput } from "@/lib/types";
import { displayProductWithModel } from "@/lib/types";

export type ProductKind =
  | "circulator"
  | "aircon_related"
  | "gadget"
  | "fashion"
  | "cosmetics"
  | "book_game"
  | "home"
  | "general";

/** Infer product kind from name/category for buyer-benefit copy */
export function detectProductKind(input: {
  category?: Category | string | null;
  productName?: string | null;
  brand?: string | null;
  notes?: string | null;
}): ProductKind {
  const blob = [
    input.category,
    input.brand,
    input.productName,
    input.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if ((input.category ?? "").includes("コスメ") || /コスメ|美容|スキンケア|化粧水|ファンデーション/.test(blob)) {
    return "cosmetics";
  }
  if (
    /サーキュ|circul|空気循環|扇風機|dcモーター.*扇|リビング扇|タワーファン/.test(
      blob,
    )
  ) {
    return "circulator";
  }
  if (/エアコン|空調|除湿|加湿器|空気清浄|ヒーター|暖房|冷房/.test(blob)) {
    return "aircon_related";
  }
  if (
    /ipad|iphone|airpods|スマホ|ガジェット|ノートpc|イヤホン|ヘッドホン|sony|apple/.test(
      blob,
    ) ||
    (input.category ?? "").includes("家電")
  ) {
    if (/家電|ガジェット/.test(input.category ?? "") && !/服|ファッション/.test(blob)) {
      if (/掃除機|レンジ|炊飯|冷蔵庫|洗濯機|トースター|ケトル/.test(blob)) {
        return "home";
      }
    }
    if (/ipad|iphone|airpods|スマホ|pc|イヤホン|ヘッドホン/.test(blob)) {
      return "gadget";
    }
    if ((input.category ?? "").includes("家電")) return "home";
  }
  if (
    (input.category ?? "").includes("ファッション") ||
    (input.category ?? "").includes("古着") ||
    /nike|dunk|uniqlo|シャツ|スニーカー/.test(blob)
  ) {
    return "fashion";
  }
  if (
    (input.category ?? "").includes("本") ||
    (input.category ?? "").includes("ゲーム")
  ) {
    return "book_game";
  }
  if ((input.category ?? "").includes("インテリア")) return "home";
  return "general";
}

function defaultStrengths(kind: ProductKind): string[] {
  switch (kind) {
    case "circulator":
      return [
        "空気循環でエアコン効率アップ＆節電",
        "静音寄りで夜間・室内干しも快適",
        "エアコン併用で冷暖房効率が上がり、電気代の節約にもつながります",
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

/** Opening benefit paragraph — uses user-confirmed brand / name / model */
export function buyerBenefitLead(input: ProductInput): string {
  const kind = detectProductKind(input);
  const brand = input.brand.trim();
  const product = displayProductWithModel(input);
  const s = defaultStrengths(kind);
  const subject = `${brand}の「${product}」`;

  if (kind === "circulator") {
    return [
      `${subject}なら、${s[0]}。`,
      `${s[2]}。`,
      `${s[1]}です。`,
    ].join("");
  }

  switch (kind) {
    case "aircon_related":
      return `${subject}で、室内の温度・湿度を整え、帰宅後も寝る前も『ちょうどいい』空間へ。光熱費と快適さのバランスを毎日実感できます。`;
    case "gadget":
      return `${subject}なら、${s[0]}。${s[1]}勉強・仕事・エンタメまで一台で完結する体験が始まります。`;
    case "fashion":
      return `${subject}で、${s[0]}。着た瞬間から毎日のコーデが決まりやすい一品です。`;
    case "cosmetics":
      return `${subject}なら、${s[0]}。${s[1]}毎日のケアが続くほど、コスパと仕上がりの満足感が積み重なります。`;
    case "book_game":
      return `${subject}で今夜から没頭タイム。手元に置いた瞬間から楽しみが始まります。`;
    case "home":
      return `${subject}で家事が一段ラクに。${s[0]}導入後の生活の快適さが想像できる一台です。`;
    default:
      return `${subject}で、${s[0]}。欲しい気持ちがピークの今が、いちばん後悔しないタイミングです。`;
  }
}

/** Short FOMO / scene lines for purchase boost */
export function buyerBoostSceneLines(input: ProductInput): string[] {
  const kind = detectProductKind(input);
  const product = displayProductWithModel(input);
  const brand = input.brand.trim();
  const s = defaultStrengths(kind);
  const label = `${brand}の${product}`;

  if (kind === "circulator") {
    return [
      `${label}で${s[0]}を体感。エアコン併用の節電効果も狙えます`,
      `${s[1]}で室内干しの乾きが早く、就寝中も気にならない。今夜からの快適を先取りできます`,
      `${s[2]}を実感したい人ほど、迷っている間に売り切れるタイプです`,
    ];
  }

  switch (kind) {
    case "aircon_related":
      return [
        `${label}で、帰宅後すぐ『涼しさ／暖かさ』が届く毎日へ`,
        "寝室・リビングのどちらでも活躍。季節の変わり目にこそ、今すぐ手元に欲しくなる一台です",
      ];
    case "gadget":
      return [
        `${label}で、${s[0]}。通勤の動画・勉強・会議まで一台完結`,
        `${s[1]}『あとで』の前に在庫が消えるタイプです`,
      ];
    case "fashion":
      return [`${label}で明日のコーデが決まる。${s[0]}`];
    case "cosmetics":
      return [
        `${label}で、${s[0]}。残量が明確なので『今買う』判断がしやすい1点です`,
      ];
    case "book_game":
      return [`${product}で今夜から没頭タイム。見つけた瞬間に押したくなる一本です`];
    case "home":
      return [`${label}で家事が一段ラクに。${s[0]}`];
    default:
      return [
        `${label}で、${s[0]}。欲しい気持ちがピークの今が買い時です`,
      ];
  }
}
