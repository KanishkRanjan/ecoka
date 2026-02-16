import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { cacheGet, cacheSet, cacheInvalidate } from '../cache';

export const productsRouter = Router();

productsRouter.get('/', async (req, res, next) => {
  try {
    const { q, category, brand, minPrice, maxPrice, refurbishedOnly } = req.query as Record<string, string | undefined>;
    const cacheKey = `products:list:${JSON.stringify(req.query)}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const where: Prisma.ProductWhereInput = {};
    if (category) where.category = category as any;
    if (brand) where.brand = { equals: brand, mode: 'insensitive' };
    if (refurbishedOnly === 'true') where.condition = 'REFURBISHED_CERTIFIED';
    if (minPrice || maxPrice) {
      where.priceCents = {};
      if (minPrice) (where.priceCents as any).gte = Number(minPrice);
      if (maxPrice) (where.priceCents as any).lte = Number(maxPrice);
    }
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }
    const products = await prisma.product.findMany({
      where,
      orderBy: [{ ecoScore: 'desc' }, { name: 'asc' }],
      take: 60,
    });
    const payload = { products, count: products.length };
    await cacheSet(cacheKey, payload, 60);
    res.json(payload);
  } catch (e) {
    next(e);
  }
});

productsRouter.get('/:slug', async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { slug: req.params.slug } });
    if (!product) return res.status(404).json({ error: 'not_found' });
    res.json({ product });
  } catch (e) {
    next(e);
  }
});

productsRouter.post('/_invalidate-cache', async (_req, res) => {
  await cacheInvalidate('products:');
  res.json({ ok: true });
});
