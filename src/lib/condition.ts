import { CONDITIONS, type Condition } from "@/lib/types";

/**
 * Detect mercari-style condition from free-text memo.
 * Damage / wear phrases are checked BEFORE "美品/傷なし" to avoid
 * misclassifying「傷多い」as「目立った傷や汚れなし」.
 */
export function detectCondition(text: string): Condition {
  const t = text.trim();
  if (!t) return "目立った傷や汚れなし";

  // Worst → best (order is critical)
  const rules: Array<{ value: Condition; pattern: RegExp }> = [
    {
      value: "傷や汚れあり",
      pattern:
        /傷や汚れあり|傷多|傷ひび|傷あり|汚れ多|汚れあり|難あり|ジャンク|破損|ヒビ|割れ|欠け|大きな傷|目立つ傷|使用感強い|使用感が強い|かなり使用/,
    },
    {
      value: "やや傷や汚れあり",
      pattern:
        /やや傷や汚れあり|やや傷|少し傷|小傷|薄汚れ|使用感あり|使用感がある|スレあり|擦れ/,
    },
    {
      value: "新品未使用",
      pattern: /新品未使用|新品|未開封|タグ付き新品/,
    },
    {
      value: "未使用に近い",
      pattern: /未使用に近い|ほぼ新品|未使用同等|ワンオーナー未使用/,
    },
    {
      value: "目立った傷や汚れなし",
      pattern:
        /目立った傷や汚れなし|美品|傷なし|汚れなし|きれい|良好|問題なし/,
    },
  ];

  for (const rule of rules) {
    if (rule.pattern.test(t)) return rule.value;
  }

  return "目立った傷や汚れなし";
}

/** Human-readable condition label for description body */
export function conditionDisplayLabel(
  condition: Condition,
  conditionMemo?: string,
): string {
  const memo = conditionMemo?.trim();
  if (condition === "傷や汚れあり") {
    return memo
      ? `傷や汚れあり（使用感あり）※${memo}`
      : "傷や汚れあり（使用感あり）";
  }
  if (condition === "やや傷や汚れあり") {
    return memo
      ? `やや傷や汚れあり（軽度の使用感）※${memo}`
      : "やや傷や汚れあり（軽度の使用感）";
  }
  if (memo) return `${condition}（${memo}）`;
  return condition;
}

export function conditionBodyCopy(
  condition: Condition,
  conditionMemo?: string,
): string {
  const memo = conditionMemo?.trim();
  switch (condition) {
    case "新品未使用":
      return "未使用のコンディションです。開封のワクワクを、いちばんいい状態で味わえます。";
    case "未使用に近い":
      return "ほぼ未使用に近い状態。届いたその日から、ストレスなく使い始められます。";
    case "目立った傷や汚れなし":
      return "目立った傷・汚れは少なくきれいなコンディション。届いたその日から安心して毎日の相棒にできます。";
    case "やや傷や汚れあり":
      return [
        "軽度の傷や汚れ・使用感があります。日常使いの本筋には支障がなく、その分お求めやすい価格で体験をスタートできます。",
        memo ? `詳細：${memo}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    case "傷や汚れあり":
      return [
        "傷や汚れあり（使用感あり）です。見た目の使用感はある一方、使ううえでの本筋は問題ない範囲。新品相場よりお得に、今すぐ使い始められます。",
        memo ? `詳細：${memo}` : "コンディション詳細は記載のとおりです。",
      ]
        .filter(Boolean)
        .join("\n");
    default:
      return CONDITIONS.includes(condition)
        ? `${condition}です。`
        : "状態は記載のとおりです。";
  }
}

/** Short labels for condition selection buttons */
export const CONDITION_BUTTON_LABELS: Record<Condition, string> = {
  新品未使用: "新品同様",
  未使用に近い: "未使用に近い",
  目立った傷や汚れなし: "目立った傷なし",
  やや傷や汚れあり: "やや傷や汚れあり",
  傷や汚れあり: "傷や汚れあり",
};
