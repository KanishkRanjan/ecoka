import { Router } from 'express';
export const cartRouter = Router();
cartRouter.get('/:sessionId', (_req, res) => res.json({ items: [] }));
