import { Router } from 'express';
import { prisma } from '../db';
import { cacheGet, cacheSet, redis } from '../cache';

export const cartRouter = Router();

interface CartItem {
  productId: string;
  qty: number;
}

const cartKey = (sid: string) => `cart:${sid}`;

cartRouter.get('/:sid', async (req, res, next) => {
  try {
    const items = (await cacheGet<CartItem[]>(cartKey(req.params.sid))) ?? [];
    if (items.length === 0) return res.json({ items: [], products: [], totalCents: 0 });
    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
    });
    const totalCents = items.reduce((sum, it) => {
      const p = products.find((p) => p.id === it.productId);
      return sum + (p ? p.priceCents * it.qty : 0);
    }, 0);
    res.json({ items, products, totalCents });
  } catch (e) {
    next(e);
  }
});

cartRouter.post('/:sid/add', async (req, res, next) => {
  try {
    const { productId, qty } = req.body as { productId: string; qty?: number };
    if (!productId) return res.status(400).json({ error: 'missing productId' });
    const items = (await cacheGet<CartItem[]>(cartKey(req.params.sid))) ?? [];
    const existing = items.find((i) => i.productId === productId);
    if (existing) existing.qty += qty ?? 1;
    else items.push({ productId, qty: qty ?? 1 });
    await cacheSet(cartKey(req.params.sid), items, 60 * 60 * 24);
    res.json({ items });
  } catch (e) {
    next(e);
  }
});

cartRouter.post('/:sid/remove', async (req, res, next) => {
  try {
    const { productId } = req.body as { productId: string };
    const items = (await cacheGet<CartItem[]>(cartKey(req.params.sid))) ?? [];
    const next = items.filter((i) => i.productId !== productId);
    await cacheSet(cartKey(req.params.sid), next, 60 * 60 * 24);
    res.json({ items: next });
  } catch (e) {
    next(e);
  }
});

cartRouter.post('/:sid/clear', async (req, res, next) => {
  try {
    try {
      await redis.del(cartKey(req.params.sid));
    } catch {
      /* cache may be unavailable */
    }
    res.json({ items: [] });
  } catch (e) {
    next(e);
  }
});
