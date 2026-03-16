import { Router } from 'express';
import { prisma } from '../db';
import { Category } from '@prisma/client';

export const advisorRouter = Router();

const KEYWORDS: Array<{ match: RegExp; categories: Category[] }> = [
  { match: /(video|edit|render|color|4k|creator)/i, categories: [Category.LAPTOP, Category.MONITOR, Category.SSD] },
  { match: /(llm|ai|train|inference|gpu|cuda|ml)/i, categories: [Category.GPU, Category.LAPTOP, Category.SSD] },
  { match: /(game|gaming|144hz|fps)/i, categories: [Category.GPU, Category.MONITOR, Category.KEYBOARD] },
  { match: /(office|productivity|writing|wfh)/i, categories: [Category.LAPTOP, Category.MONITOR, Category.KEYBOARD, Category.MOUSE] },
  { match: /(travel|portable|light|ultraportable)/i, categories: [Category.LAPTOP, Category.HEADPHONES] },
  { match: /(audio|music|noise|listen)/i, categories: [Category.HEADPHONES] },
  { match: /(eco|sustain|repair|refurb)/i, categories: [Category.LAPTOP, Category.PHONE] },
];

advisorRouter.post('/', async (req, res, next) => {
  try {
    const query = String(req.body?.query ?? '').trim();
    if (!query) return res.status(400).json({ error: 'missing query' });

    const cats = new Set<Category>();
    for (const k of KEYWORDS) if (k.match.test(query)) k.categories.forEach((c) => cats.add(c));
    if (cats.size === 0) Object.values(Category).forEach((c) => cats.add(c as Category));

    const wantsEco = /(eco|sustain|repair|refurb|green)/i.test(query);

    const products = await prisma.product.findMany({
      where: { category: { in: Array.from(cats) } },
      orderBy: wantsEco
        ? [{ ecoScore: 'desc' }]
        : [{ ecoScore: 'desc' }, { priceCents: 'desc' }],
      take: 10,
    });

    res.json({
      query,
      interpretation: { categories: Array.from(cats), wantsEco },
      products,
      // SWAP-IN POINT: replace this rule-based pipeline with an LLM call
      // (e.g. Anthropic Claude) that returns a JSON list of slugs to fetch.
      note: 'Rule-based stub. Wire an LLM here to interpret natural language.',
    });
  } catch (e) {
    next(e);
  }
});
