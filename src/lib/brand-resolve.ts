import { extractCodeHint, extractLabelHint } from "@/lib/model-estimate";

export type BrandCandidate = {
  brand: string;
  strengths: string[];
  reason?: string;
};

export type BrandConfidence = "certain" | "ambiguous" | "unknown" | "user";

export type BrandResolution = {
  /** Empty string when ambiguous/unknown and user has not chosen */
  brand: string;
  productLabel: string;
  modelId: string | null;
  strengths: string[];
  confidence: BrandConfidence;
  /** Suggested manufacturers when not 100% certain */
  candidates: BrandCandidate[];
  source: "input" | "model-code" | "product-name" | "fallback";
};

type CertainRule = {
  /** Must be uniquely identifiable */
  test: (blob: string, code: string) => boolean;
  brand: string;
  strengths: string[];
  source: BrandResolution["source"];
  label?: (rawProduct: string, code: string) => string;
};

type AmbiguousGroup = {
  test: (blob: string, code: string) => boolean;
  candidates: BrandCandidate[];
  strengths: string[];
  label?: (rawProduct: string, code: string) => string;
};

/** 100% certain manufacturer from model code / explicit brand signals */
const CERTAIN_RULES: CertainRule[] = [
  {
    test: (blob, code) =>
      /\bapple\b|アップル/.test(blob) || /^A\d{4}$/i.test(code),
    brand: "Apple",
    strengths: [
      "操作が直感的で、届いたその日から使い始めやすい",
      "アプリ・周辺機器との連携がスムーズ",
      "リセールバリューが高く、長く安心して使える",
    ],
    source: "model-code",
  },
  {
    test: (blob) =>
      /\bsony\b|ソニー/.test(blob) || /wh-1000|wf-1000|ブラビア|xperia/.test(blob),
    brand: "Sony",
    strengths: [
      "音質・映像の完成度が高く没入感がある",
      "ノイズキャンセリング等の実用機能が強い",
      "毎日の通勤・在宅作業の快適さが一段上がる",
    ],
    source: "product-name",
  },
  {
    test: (blob) => /パナソニック|panasonic|\bnational\b/.test(blob),
    brand: "Panasonic",
    strengths: [
      "日本の生活シーンに合わせた使いやすさ",
      "信頼感のある家電ブランドで安心感が高い",
      "毎日の家事・空調をストレスなく支えられる",
    ],
    source: "product-name",
  },
  {
    test: (blob) => /シャープ|sharp|プラズマクラスター/.test(blob),
    brand: "Sharp",
    strengths: [
      "空気清浄・消臭など暮らしの空気質を整える",
      "季節家電としての実用メリットが明確",
      "家族みんなが快適に過ごせる空間づくり",
    ],
    source: "product-name",
  },
  {
    test: (blob) => /dyson|ダイソン/.test(blob),
    brand: "Dyson",
    strengths: [
      "吸引力・空気清浄など本体性能の説得力",
      "掃除時間が短くなり暮らしに余白ができる",
      "デザイン性も高く生活空間に馴染む",
    ],
    source: "product-name",
  },
  {
    test: (blob) => /nike|ナイキ|dunk|air\s*force|jordan/.test(blob),
    brand: "Nike",
    strengths: [
      "コーデの主役になる定番デザイン",
      "履き心地とストリート感のバランスが良い",
      "トレンドを押さえつつ長く使える一足",
    ],
    source: "product-name",
  },
  {
    test: (blob) => /uniqlo|ユニクロ|エアリズム/.test(blob),
    brand: "UNIQLO",
    strengths: [
      "日常使いにちょうどいい着心地",
      "洗濯しやすく、手放しで回せる実用性",
      "シンプルで合わせやすい定番アイテム",
    ],
    source: "product-name",
  },
  {
    // Iris-specific model prefixes are treated as certain
    test: (blob, code) =>
      /アイリス|iris\s*ohyama|irisohyama/.test(blob) ||
      /^(pcf|kcf)[-_]/i.test(code) ||
      /^pcf|^kcf/i.test(code),
    brand: "アイリスオーヤマ",
    strengths: [
      "スパイラル気流で部屋全体をすばやく循環",
      "静音設計で就寝中・室内干しも快適",
      "エアコン併用で冷暖房効率アップ＆節電",
      "左右首振り・風量調整でシーンに合わせて使える",
    ],
    source: "model-code",
    label: (raw, code) => {
      if (/サーキュ/.test(raw)) {
        return raw.includes(code) ? raw : `${raw} ${code}`.trim();
      }
      return `サーキュレーター ${code}`.trim();
    },
  },
];

const CIRCULATOR_STRENGTHS = [
  "空気循環でエアコン効率アップ＆節電",
  "静音寄り設計で夜間・室内干しも快適",
  "風量調整でシーンに合わせて使える",
];

/** Ambiguous categories → show manufacturer chips */
const AMBIGUOUS_GROUPS: AmbiguousGroup[] = [
  {
    test: (blob, code) =>
      /サーキュ|扇風機|タワーファン|リビング扇|circul/.test(blob) ||
      /az[-_]?sdc|sdc\d/i.test(code),
    strengths: CIRCULATOR_STRENGTHS,
    candidates: [
      {
        brand: "アイリスオーヤマ",
        strengths: [
          "スパイラル気流で部屋全体をすばやく循環",
          "静音設計で就寝中・室内干しも快適",
          "エアコン併用で冷暖房効率アップ＆節電",
        ],
        reason: "人気のサーキュレーターメーカー",
      },
      {
        brand: "山善",
        strengths: [
          "コスパ良く空気循環・送風を始められる",
          "シンプル操作で毎日使いやすい",
          "エアコン併用の節電サポートに向く",
        ],
        reason: "家電量販・通販で定番",
      },
      {
        brand: "ドウシシャ",
        strengths: [
          "デザイン性と実用のバランスが良い",
          "リビングでも違和感なく置ける",
          "季節の空気づくりを手軽にアップグレード",
        ],
      },
      {
        brand: "スリーアップ",
        strengths: [
          "コンパクトで置き場所を選ばない",
          "生活家電としての使い勝手が良い",
          "部屋干し・換気の補助に便利",
        ],
      },
    ],
    label: (raw, code) => {
      if (/サーキュ|扇/.test(raw)) return raw;
      return code ? `サーキュレーター ${code}` : raw || "サーキュレーター";
    },
  },
  {
    test: (blob) => /除湿|加湿器|空気清浄/.test(blob),
    strengths: [
      "室内の湿度・空気質を整えやすい",
      "季節の変わり目の快適さに効く",
      "光熱費と快適さのバランスを取りやすい",
    ],
    candidates: [
      {
        brand: "シャープ",
        strengths: [
          "空気清浄・消臭など空気質ケアが強い",
          "家族の快適空間づくりに向く",
        ],
      },
      {
        brand: "パナソニック",
        strengths: [
          "日本の暮らしに合わせた使いやすさ",
          "信頼感のある家電ブランド",
        ],
      },
      {
        brand: "アイリスオーヤマ",
        strengths: [
          "コスパ良く季節家電を揃えやすい",
          "実用機能が分かりやすい",
        ],
      },
      {
        brand: "山善",
        strengths: [
          "手頃な価格で快適さを始められる",
          "シンプル操作で毎日使いやすい",
        ],
      },
    ],
  },
];

const GENERIC_STRENGTHS = [
  "日常のストレスを減らす実用メリット",
  "届いたその日から使い始めやすい分かりやすさ",
  "価格以上の満足感を感じやすいバランス",
];

export function isPlaceholderBrand(brand: string): boolean {
  const b = brand.trim();
  if (!b) return true;
  return /^(メーカー推定|不明ブランド|ブランド|要特定|unknown|n\/?a)$/i.test(b);
}

function featureStrengthsFromText(blob: string): string[] {
  if (/サーキュ|扇|circul/.test(blob)) return CIRCULATOR_STRENGTHS;
  if (/ipad|iphone|スマホ|イヤホン|ヘッドホン/.test(blob)) {
    return [
      "毎日の作業・エンタメがスムーズになる",
      "操作が分かりやすくすぐ使い始められる",
      "長く使える実用性が高い",
    ];
  }
  if (/掃除機|掃除/.test(blob)) {
    return [
      "掃除時間が短くなり暮らしに余白ができる",
      "吸引・操作性の実用メリットが分かりやすい",
    ];
  }
  return GENERIC_STRENGTHS;
}

/**
 * Resolve manufacturer with flexible branching:
 * - certain → auto brand
 * - ambiguous → candidates chips (brand may stay empty)
 * - unknown → empty brand + feature-based strengths
 */
export function resolveBrandFromInput(input: {
  brand?: string | null;
  productName?: string | null;
  notes?: string | null;
}): BrandResolution {
  const brandIn = (input.brand ?? "").trim();
  const productIn = (input.productName ?? "").trim();
  const notes = (input.notes ?? "").trim();
  const blob = `${brandIn} ${productIn} ${notes}`.toLowerCase();
  const code = extractCodeHint(`${productIn} ${notes} ${brandIn}`);
  const labelHint = extractLabelHint(productIn) || productIn;
  const modelId = code && code !== "UNKNOWN" ? code : null;

  // User explicitly chose a real brand
  if (brandIn && !isPlaceholderBrand(brandIn)) {
    const certain = CERTAIN_RULES.find((r) => r.test(blob, code));
    const amb = AMBIGUOUS_GROUPS.find((g) => g.test(blob, code));
    const matchedCandidate = amb?.candidates.find((c) => c.brand === brandIn);
    return {
      brand: brandIn,
      productLabel: productIn || labelHint || code || "商品",
      modelId,
      strengths:
        matchedCandidate?.strengths ||
        certain?.strengths ||
        amb?.strengths ||
        featureStrengthsFromText(blob),
      confidence: "user",
      candidates: amb?.candidates ?? [],
      source: "input",
    };
  }

  // 1) Certain manufacturer
  for (const rule of CERTAIN_RULES) {
    if (!rule.test(blob, code)) continue;
    return {
      brand: rule.brand,
      productLabel:
        rule.label?.(productIn || labelHint, code) ||
        productIn ||
        labelHint ||
        code,
      modelId,
      strengths: rule.strengths,
      confidence: "certain",
      candidates: [],
      source: rule.source,
    };
  }

  // 2) Ambiguous → candidates only (do not force a brand)
  for (const group of AMBIGUOUS_GROUPS) {
    if (!group.test(blob, code)) continue;
    return {
      brand: "",
      productLabel:
        group.label?.(productIn || labelHint, code) ||
        productIn ||
        labelHint ||
        code,
      modelId,
      strengths: group.strengths,
      confidence: "ambiguous",
      candidates: group.candidates,
      source: "product-name",
    };
  }

  // 3) Unknown → empty brand, feature-based copy
  return {
    brand: "",
    productLabel: productIn || labelHint || code || "商品",
    modelId,
    strengths: featureStrengthsFromText(blob),
    confidence: "unknown",
    candidates: [],
    source: "fallback",
  };
}

/**
 * Enrich input for generation.
 * - certain/user → fill brand
 * - ambiguous/unknown → keep brand empty unless user already set one
 */
export function applyBrandResolution<T extends {
  brand: string;
  productName: string;
  notes?: string;
}>(input: T): T & { brand: string; productName: string } {
  const resolved = resolveBrandFromInput(input);
  const brand =
    resolved.confidence === "certain" || resolved.confidence === "user"
      ? resolved.brand
      : input.brand && !isPlaceholderBrand(input.brand)
        ? input.brand.trim()
        : "";

  return {
    ...input,
    brand,
    productName: resolved.productLabel,
  };
}

/** Display helper for UI status text */
export function brandConfidenceLabel(confidence: BrandConfidence): string {
  switch (confidence) {
    case "certain":
      return "メーカーを自動特定しました";
    case "ambiguous":
      return "メーカー候補から選択するか、空欄のまま機能ベースで生成できます";
    case "unknown":
      return "メーカー未特定のため、機能・使い勝手ベースで生成します";
    case "user":
      return "選択中のメーカーを使用します";
  }
}
