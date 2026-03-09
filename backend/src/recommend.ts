import type { Product } from '@prisma/client';

export interface RecommendOptions {
  topK?: number;
  ecoBias?: number; // 0..1 — extra weight on eco score for "eco-alternative"
}

interface Vector {
  features: number[];
}

const NUM_FEATURES = 8;

function safeNum(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function vectorize(p: Product): Vector {
  const s = (p.specs ?? {}) as Record<string, any>;
  return {
    features: [
      p.priceCents / 100000,
      p.weightKg,
      safeNum(s.ramGb ?? s.vramGb ?? s.capacityGb),
      safeNum(s.cores ?? s.cudaCores ?? s.streamProcessors) / 1000,
      safeNum(s.refreshHz),
      safeNum(s.sizeIn ?? s.storageGb / 100),
      safeNum(s.tdpW),
      safeNum(s.seqReadMBs ?? s.geekbench6) / 1000,
    ],
  };
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function recommend(
  target: Product,
  candidates: Product[],
  opts: RecommendOptions = {},
): Array<Product & { similarity: number }> {
  const topK = opts.topK ?? 5;
  const ecoBias = opts.ecoBias ?? 0;
  const targetVec = vectorize(target).features;

  const scored = candidates
    .filter((c) => c.id !== target.id && c.category === target.category)
    .map((c) => {
      const sim = cosine(targetVec, vectorize(c).features);
      const ecoBoost = ecoBias * (c.ecoScore / 100);
      return { ...c, similarity: sim * (1 - ecoBias) + ecoBoost };
    });

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK);
}

void NUM_FEATURES;
