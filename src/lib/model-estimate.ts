import {
  lookupLocalModelVariants,
  normalizeModelQuery,
  type ModelLookupResult,
} from "@/lib/gadget-models";

/** Extract model-like code from free text (supports PCF-SC15T, A2588, etc.) */
export function extractCodeHint(raw: string): string {
  const text = raw.trim();
  // Multi-segment appliance codes: PCF-SC15T, ABC-1234XY
  const multi = text.match(
    /\b([A-Z]{1,6}(?:[-_][A-Z0-9]{1,8})+)\b/i,
  );
  if (multi?.[1]) return multi[1].toUpperCase();

  const simple = text.match(
    /\b([A-Z]{1,6}[-_]?\d{2,6}[A-Z0-9-]*)\b/i,
  );
  if (simple?.[1]) return simple[1].toUpperCase();

  return (
    normalizeModelQuery(text) || text.replace(/\s+/g, "").toUpperCase() || "UNKNOWN"
  );
}

export function extractLabelHint(raw: string): string {
  const withoutCode = raw
    .replace(/\b([A-Z]{1,6}(?:[-_][A-Z0-9]{1,8})+)\b/gi, " ")
    .replace(/\b([A-Z]{1,6}[-_]?\d{2,6}[A-Z0-9-]*)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return withoutCode || raw.trim();
}

/**
 * Guaranteed ≥1 candidate from any non-empty text.
 * Never returns empty — hit-rate 100% fallback for unknown SKUs.
 */
export function estimateModelVariants(
  modelId: string,
  rawQuery?: string,
): ModelLookupResult {
  const raw = (rawQuery ?? modelId).trim() || modelId;
  const q = raw.toLowerCase();
  const id = extractCodeHint(raw) || modelId || "UNKNOWN";
  const label = extractLabelHint(raw);

  if (/cir|circul|pcf|az[-_]?sdc|サーキュ|循環|扇風機|fan|cooler|空調|除湿|humid/i.test(q)) {
    const base = label.includes("サーキュ")
      ? label
      : label && label.toUpperCase() !== id
        ? `${label} サーキュレーター`.trim()
        : `サーキュレーター ${id}`;
    return {
      modelId: id,
      brand: /アイリス|iris|pcf|az[-_]?sdc|sdc/i.test(q + id)
        ? "アイリスオーヤマ"
        : "メーカー推定",
      categoryHint: "家電・ガジェット",
      productBaseName: `${base}（型番 ${id}）`,
      candidates: [
        {
          id: `est-${id}-std`,
          name: `${base} 型番${id} 標準（推定・空気循環/節電）`,
        },
        {
          id: `est-${id}-w`,
          name: `${base} 型番${id} ホワイト（推定・静音/部屋干し）`,
          color: "ホワイト",
        },
        {
          id: `est-${id}-b`,
          name: `${base} 型番${id} ブラック（推定・静音/快適睡眠）`,
          color: "ブラック",
        },
      ],
      source: "ai",
    };
  }

  if (/ipad|iphone|airpods|\ba\d{4}\b/i.test(q)) {
    const local = lookupLocalModelVariants(id);
    if (local?.candidates.length) return local;
  }

  const local = lookupLocalModelVariants(id);
  if (local?.candidates.length) return local;

  const display = label && label.toUpperCase() !== id ? `${label}（${id}）` : `型番 ${id}`;
  const fashion = /nike|dunk|uniqlo|シャツ|靴|sneaker|服/i.test(q);

  return {
    modelId: id,
    brand: "メーカー推定",
    categoryHint: fashion ? "ファッション・古着" : "家電・ガジェット",
    productBaseName: `${display} 相当品（推定）`,
    candidates: [
      {
        id: `est-${id}-1`,
        name: `${display} 本体・標準仕様（推定）`,
      },
      {
        id: `est-${id}-2`,
        name: `${display} カラー/付属違い候補（推定）`,
      },
    ],
    source: "ai",
  };
}
