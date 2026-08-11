import type { BoostPattern, BoostPatternId, ProductInput } from "@/lib/types";
import { confirmedSeoCore, displayProductWithModel } from "@/lib/types";

export const BOOST_PATTERN_META: Record<
  BoostPatternId,
  { label: string; angle: string }
> = {
  value: {
    label: "パターンA: コスパ・お得感訴求",
    angle: "価格対効果・今が買い時",
  },
  speed: {
    label: "パターンB: スピード・即効性訴求",
    angle: "発送の速さ・今すぐ欲しい",
  },
  trust: {
    label: "パターンC: 実用性・安心感訴求",
    angle: "動作確認・実用上の安心",
  },
};

export const RECOMMENDED_BADGE = "🔥 SEO・成約率的におすすめ！";

/** Deterministic local fallback for the 3 boost angles */
export function buildLocalBoostPatterns(input: ProductInput): BoostPattern[] {
  const core = confirmedSeoCore(input);
  const product = displayProductWithModel(input);
  const memo = (input.conditionMemo || input.notes || "").trim();
  const hasFastShip = /24時間|即日|すぐ発送|当日発送/.test(memo);
  const hasChecked = /動作|確認|点灯|通電|問題なし/.test(memo);
  const hasWear =
    input.condition.includes("傷") ||
    /傷|スレ|汚れ|使用感/.test(memo);

  const patterns: BoostPattern[] = [
    {
      id: "value",
      ...BOOST_PATTERN_META.value,
      comment: hasWear
        ? `${core}を、見た目の使用感はあるぶん新品相場よりお得に手に入れられるチャンスです！`
        : `${product}（${input.brand}）をこのコンディション・価格帯で狙える絶好の機会です！`,
      recommended: false,
    },
    {
      id: "speed",
      ...BOOST_PATTERN_META.speed,
      comment: hasFastShip
        ? "24時間以内発送！今すぐ欲しい方に最適なスピード対応です"
        : "迅速発送対応。届いたその日から使い始めたい方にぴったりです",
      recommended: false,
    },
    {
      id: "trust",
      ...BOOST_PATTERN_META.trust,
      comment: hasChecked
        ? "動作確認済み＆実用上問題なし。安心して毎日使える1点です！"
        : hasWear
          ? "傷は実用上気になりにくい範囲。使ううえでの本筋は問題なく安心です"
          : "状態良好で安心感抜群。届いてすぐ快適に使い始められます",
      recommended: false,
    },
  ];

  // Heuristic: recommend trust if wear/check notes, else value for SEO keyword density
  const recommendedId: BoostPatternId = hasWear || hasChecked ? "trust" : "value";
  return patterns.map((p) => ({
    ...p,
    recommended: p.id === recommendedId,
  }));
}

export function pickRecommendedBoostId(
  patterns: BoostPattern[],
): BoostPatternId {
  return patterns.find((p) => p.recommended)?.id ?? patterns[0]?.id ?? "value";
}

export function normalizeBoostPatterns(
  raw: Array<{
    id?: string;
    comment?: string;
    recommended?: boolean;
  }>,
  fallback: BoostPattern[],
): BoostPattern[] {
  const byId = new Map(fallback.map((p) => [p.id, p]));
  const order: BoostPatternId[] = ["value", "speed", "trust"];

  let recommendedSeen = false;
  const normalized = order.map((id) => {
    const fromAi = raw.find((r) => r.id === id);
    const base = byId.get(id)!;
    const recommended = Boolean(fromAi?.recommended) && !recommendedSeen;
    if (recommended) recommendedSeen = true;
    return {
      ...base,
      comment: (fromAi?.comment || base.comment).trim() || base.comment,
      recommended,
    };
  });

  if (!normalized.some((p) => p.recommended)) {
    normalized[0] = { ...normalized[0], recommended: true };
  }

  return normalized;
}

export function boostCommentsFromPatterns(patterns: BoostPattern[]): string[] {
  return patterns.map((p) => p.comment);
}
