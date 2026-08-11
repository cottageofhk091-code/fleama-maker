/**
 * Apple / gadget model ID → product specs & capacity/color variants.
 */

export type GadgetModelSpec = {
  modelId: string;
  brand: string;
  /** Full marketplace-friendly product name */
  productName: string;
  categoryHint: "家電・ガジェット" | "ファッション・古着" | "コスメ・美容" | "その他";
  storage?: string;
  connectivity?: string;
  generation?: string;
};

/** One selectable SKU when a Model ID maps to multiple configs */
export type GadgetProductCandidate = {
  id: string;
  name: string;
  storage?: string;
  connectivity?: string;
  color?: string;
  generation?: string;
};

/** Common iPad / iPhone model identifiers (default / representative SKU) */
export const GADGET_MODEL_CATALOG: Record<string, GadgetModelSpec> = {
  A2588: {
    modelId: "A2588",
    brand: "Apple",
    productName: "iPad Air 第5世代 64GB Wi-Fiモデル",
    categoryHint: "家電・ガジェット",
    storage: "64GB",
    connectivity: "Wi-Fi",
    generation: "第5世代",
  },
  A2589: {
    modelId: "A2589",
    brand: "Apple",
    productName: "iPad Air 第5世代 64GB Wi-Fi+Cellularモデル",
    categoryHint: "家電・ガジェット",
    storage: "64GB",
    connectivity: "Wi-Fi+Cellular",
    generation: "第5世代",
  },
  A2436: {
    modelId: "A2436",
    brand: "Apple",
    productName: "iPad mini 第6世代 64GB Wi-Fiモデル",
    categoryHint: "家電・ガジェット",
    storage: "64GB",
    connectivity: "Wi-Fi",
    generation: "第6世代",
  },
  A2759: {
    modelId: "A2759",
    brand: "Apple",
    productName: "iPad 第10世代 64GB Wi-Fiモデル",
    categoryHint: "家電・ガジェット",
    storage: "64GB",
    connectivity: "Wi-Fi",
    generation: "第10世代",
  },
  A2435: {
    modelId: "A2435",
    brand: "Apple",
    productName: "iPad Pro 11インチ 第3世代 Wi-Fiモデル",
    categoryHint: "家電・ガジェット",
    connectivity: "Wi-Fi",
    generation: "第3世代",
  },
  A2890: {
    modelId: "A2890",
    brand: "Apple",
    productName: "iPhone 15 Pro",
    categoryHint: "家電・ガジェット",
  },
  A2846: {
    modelId: "A2846",
    brand: "Apple",
    productName: "iPhone 15",
    categoryHint: "家電・ガジェット",
  },
  ND91950: {
    modelId: "ND91950",
    brand: "Nike",
    productName: "Dunk Low Retro White/Black",
    categoryHint: "ファッション・古着",
  },
};

/**
 * Capacity / color / connectivity variants sharing the same Model ID.
 * Used as optional fast path; AI lookup is the primary resolver.
 */
export const GADGET_MODEL_VARIANTS: Record<string, GadgetProductCandidate[]> = {
  A2588: [
    {
      id: "A2588-64",
      name: "iPad Air 第5世代 64GB Wi-Fiモデル",
      storage: "64GB",
      connectivity: "Wi-Fi",
      generation: "第5世代",
    },
    {
      id: "A2588-256",
      name: "iPad Air 第5世代 256GB Wi-Fiモデル",
      storage: "256GB",
      connectivity: "Wi-Fi",
      generation: "第5世代",
    },
  ],
  A2589: [
    {
      id: "A2589-64",
      name: "iPad Air 第5世代 64GB Wi-Fi+Cellularモデル",
      storage: "64GB",
      connectivity: "Wi-Fi+Cellular",
      generation: "第5世代",
    },
    {
      id: "A2589-256",
      name: "iPad Air 第5世代 256GB Wi-Fi+Cellularモデル",
      storage: "256GB",
      connectivity: "Wi-Fi+Cellular",
      generation: "第5世代",
    },
  ],
  A2436: [
    {
      id: "A2436-64",
      name: "iPad mini 第6世代 64GB Wi-Fiモデル",
      storage: "64GB",
      connectivity: "Wi-Fi",
      generation: "第6世代",
    },
    {
      id: "A2436-256",
      name: "iPad mini 第6世代 256GB Wi-Fiモデル",
      storage: "256GB",
      connectivity: "Wi-Fi",
      generation: "第6世代",
    },
  ],
  A2759: [
    {
      id: "A2759-64",
      name: "iPad 第10世代 64GB Wi-Fiモデル",
      storage: "64GB",
      connectivity: "Wi-Fi",
      generation: "第10世代",
    },
    {
      id: "A2759-256",
      name: "iPad 第10世代 256GB Wi-Fiモデル",
      storage: "256GB",
      connectivity: "Wi-Fi",
      generation: "第10世代",
    },
  ],
  A2435: [
    {
      id: "A2435-128",
      name: "iPad Pro 11インチ 第3世代 128GB Wi-Fiモデル",
      storage: "128GB",
      connectivity: "Wi-Fi",
      generation: "第3世代",
    },
    {
      id: "A2435-256",
      name: "iPad Pro 11インチ 第3世代 256GB Wi-Fiモデル",
      storage: "256GB",
      connectivity: "Wi-Fi",
      generation: "第3世代",
    },
    {
      id: "A2435-512",
      name: "iPad Pro 11インチ 第3世代 512GB Wi-Fiモデル",
      storage: "512GB",
      connectivity: "Wi-Fi",
      generation: "第3世代",
    },
  ],
  A2890: [
    {
      id: "A2890-128",
      name: "iPhone 15 Pro 128GB",
      storage: "128GB",
    },
    {
      id: "A2890-256",
      name: "iPhone 15 Pro 256GB",
      storage: "256GB",
    },
    {
      id: "A2890-512",
      name: "iPhone 15 Pro 512GB",
      storage: "512GB",
    },
  ],
  A2846: [
    {
      id: "A2846-128",
      name: "iPhone 15 128GB",
      storage: "128GB",
    },
    {
      id: "A2846-256",
      name: "iPhone 15 256GB",
      storage: "256GB",
    },
    {
      id: "A2846-512",
      name: "iPhone 15 512GB",
      storage: "512GB",
    },
  ],
  ND91950: [
    {
      id: "ND91950-us8",
      name: "Nike Dunk Low Retro White/Black（パンダ）US8 / 26.0cm",
      color: "White/Black",
    },
    {
      id: "ND91950-us8-5",
      name: "Nike Dunk Low Retro White/Black（パンダ）US8.5 / 26.5cm",
      color: "White/Black",
    },
    {
      id: "ND91950-us9",
      name: "Nike Dunk Low Retro White/Black（パンダ）US9 / 27.0cm",
      color: "White/Black",
    },
    {
      id: "ND91950-us9-5",
      name: "Nike Dunk Low Retro White/Black（パンダ）US9.5 / 27.5cm",
      color: "White/Black",
    },
  ],
};

const MODEL_ID_RE = /\b(?:Model\s*)?(A\d{4}|ND\d{4,6}|[A-Z]{1,4}[-_]?\d{3,6}[A-Z0-9]*)\b/i;
const STORAGE_RE = /\b(64|128|256|512|1024|1)\s?(GB|TB)\b/i;

/** Normalize user-typed model codes: "a2588" / "Model A2588" → "A2588" */
export function normalizeModelQuery(query: string): string {
  return query
    .trim()
    .replace(/^Model\s+/i, "")
    .replace(/\s+/g, "")
    .toUpperCase();
}

export function extractModelId(text: string): string | null {
  const m = text.match(MODEL_ID_RE);
  if (!m) return null;
  return m[1].replace(/Model\s*/i, "").toUpperCase();
}

export function extractStorageHint(text: string): string | null {
  const m = text.match(STORAGE_RE);
  if (!m) return null;
  const amount = m[1];
  const unit = m[2].toUpperCase();
  if (amount === "1" && unit === "TB") return "1TB";
  if (amount === "1024") return "1TB";
  return `${amount}GB`;
}

export function resolveGadgetModel(modelId: string): GadgetModelSpec | null {
  return GADGET_MODEL_CATALOG[modelId.toUpperCase()] ?? null;
}

export function listGadgetVariants(
  modelId: string,
): GadgetProductCandidate[] {
  return GADGET_MODEL_VARIANTS[modelId.toUpperCase()] ?? [];
}

export type ModelLookupResult = {
  modelId: string;
  brand: string;
  categoryHint: GadgetModelSpec["categoryHint"];
  productBaseName: string;
  candidates: GadgetProductCandidate[];
  source: "catalog" | "ai";
};

/**
 * Local catalog lookup (optional fast path).
 * Prefer AI lookup via lookupModelVariants for Amazon / appliance codes.
 */
export function lookupLocalModelVariants(
  query: string,
): ModelLookupResult | null {
  const modelId =
    normalizeModelQuery(query) || extractModelId(query) || "";
  if (!modelId) return null;

  const spec = resolveGadgetModel(modelId);
  const variants = listGadgetVariants(modelId);
  if (!spec && variants.length === 0) return null;

  const candidates =
    variants.length > 0
      ? variants
      : spec
        ? [
            {
              id: `${modelId}-default`,
              name: spec.productName,
              storage: spec.storage,
              connectivity: spec.connectivity,
              generation: spec.generation,
            },
          ]
        : [];

  if (candidates.length === 0) return null;

  return {
    modelId,
    brand: spec?.brand || "不明ブランド",
    categoryHint: spec?.categoryHint || "その他",
    productBaseName: spec?.productName || modelId,
    candidates,
    source: "catalog",
  };
}

/**
 * Resolve candidates for a Model ID, optionally filtered by OCR storage hint.
 * Returns isAmbiguous when 2+ SKUs remain after filtering.
 */
export function resolveProductCandidates(params: {
  modelId: string | null;
  storageHint?: string | null;
  aiCandidates?: Array<{ name: string; storage?: string | null }>;
}): {
  isAmbiguous: boolean;
  candidates: GadgetProductCandidate[];
  resolved: GadgetProductCandidate | null;
} {
  const modelId = params.modelId?.toUpperCase() || null;
  const catalogVariants = modelId ? listGadgetVariants(modelId) : [];
  const storageHint = params.storageHint?.replace(/\s+/g, "").toUpperCase() || null;

  let candidates: GadgetProductCandidate[] =
    catalogVariants.length > 0
      ? catalogVariants
      : (params.aiCandidates ?? [])
          .filter((c) => c.name?.trim())
          .map((c, i) => ({
            id: `ai-${i}-${c.name}`,
            name: c.name.trim(),
            storage: c.storage?.trim() || undefined,
          }));

  // Prefer merging AI names when catalog empty but AI listed multiple
  if (
    catalogVariants.length === 0 &&
    params.aiCandidates &&
    params.aiCandidates.length > 1
  ) {
    candidates = params.aiCandidates
      .filter((c) => c.name?.trim())
      .map((c, i) => ({
        id: `ai-${i}-${c.name}`,
        name: c.name.trim(),
        storage: c.storage?.trim() || undefined,
      }));
  } else if (
    catalogVariants.length > 0 &&
    params.aiCandidates &&
    params.aiCandidates.length > catalogVariants.length
  ) {
    // Keep catalog as source of truth for known Model IDs
    candidates = catalogVariants;
  }

  if (storageHint && candidates.length > 1) {
    const filtered = candidates.filter((c) =>
      (c.storage || c.name).toUpperCase().includes(storageHint),
    );
    if (filtered.length > 0) candidates = filtered;
  }

  // Deduplicate by name
  const seen = new Set<string>();
  candidates = candidates.filter((c) => {
    const key = c.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (candidates.length >= 2) {
    return { isAmbiguous: true, candidates, resolved: null };
  }

  const resolved = candidates[0] ?? null;
  return { isAmbiguous: false, candidates, resolved };
}

export function formatModelResolution(spec: GadgetModelSpec): string {
  return `Model ${spec.modelId} ➔ ${spec.productName}`;
}

export function formatCandidateResolution(
  modelId: string,
  candidateName: string,
): string {
  return `Model ${modelId} ➔ ${candidateName}`;
}

/** Pipe-format memo so buildProductInput keeps the full product name */
export function candidateToProductMemo(
  brand: string,
  candidateName: string,
  modelId?: string | null,
): string {
  const note = modelId ? `Model ${modelId}` : "";
  return `${brand}|${candidateName}|||${note}`.replace(/\|+$/, "");
}
