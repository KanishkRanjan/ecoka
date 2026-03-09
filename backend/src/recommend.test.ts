import { describe, it, expect } from 'vitest';
import { recommend } from './recommend';
import type { Product } from '@prisma/client';

function makeProduct(over: Partial<Product>): Product {
  return {
    id: over.id ?? 'p',
    slug: over.slug ?? 'p',
    name: over.name ?? 'p',
    brand: 'X',
    category: (over.category ?? 'LAPTOP') as any,
    condition: 'NEW' as any,
    priceCents: 100000,
    weightKg: 1.5,
    specs: { ramGb: 16, cores: 8 },
    repairabilityScore: 5,
    energyEfficiency: 5,
    carbonKg: 100,
    ecoScore: 50,
    imageUrl: null,
    description: '',
    benchmarks: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  } as Product;
}

describe('recommend', () => {
  it('ranks similar-spec laptops above different-spec ones', () => {
    const target = makeProduct({ id: 't', slug: 't', specs: { ramGb: 16, cores: 8 } as any });
    const close = makeProduct({ id: 'a', slug: 'a', specs: { ramGb: 16, cores: 8 } as any });
    const far = makeProduct({ id: 'b', slug: 'b', priceCents: 500000, weightKg: 4, specs: { ramGb: 64, cores: 32 } as any });
    const out = recommend(target, [close, far], { topK: 2 });
    expect(out[0].id).toBe('a');
  });

  it('skips products in different categories', () => {
    const target = makeProduct({ id: 't', category: 'LAPTOP' as any });
    const otherCat = makeProduct({ id: 'm', category: 'MONITOR' as any });
    const out = recommend(target, [otherCat]);
    expect(out).toHaveLength(0);
  });

  it('eco bias boosts higher eco-score products', () => {
    const target = makeProduct({ id: 't' });
    const a = makeProduct({ id: 'a', ecoScore: 30 });
    const b = makeProduct({ id: 'b', ecoScore: 95 });
    const biased = recommend(target, [a, b], { topK: 2, ecoBias: 0.9 });
    expect(biased[0].id).toBe('b');
  });
});
