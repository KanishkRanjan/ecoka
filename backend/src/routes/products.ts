import { Router } from 'express';

export const productsRouter = Router();

productsRouter.get('/', (_req, res) => {
  res.json({ products: [], note: 'stub — populated in next commit' });
});
