import { Router } from 'express';
import { prisma } from '../db';
import { recommend } from '../recommend';

export const recommendRouter = Router();

recommendRouter.get('/:slug', async (req, res, next) => {
  try {
    const ecoBias = Number(req.query.ecoBias ?? 0);
    const target = await prisma.product.findUnique({ where: { slug: req.params.slug } });
    if (!target) return res.status(404).json({ error: 'not_found' });
    const candidates = await prisma.product.findMany({ where: { category: target.category } });
    const similar = recommend(target, candidates, { topK: 5, ecoBias: 0 });
    const ecoAlt = recommend(target, candidates, { topK: 5, ecoBias: ecoBias > 0 ? ecoBias : 0.7 });
    res.json({ similar, ecoAlt });
  } catch (e) {
    next(e);
  }
});
