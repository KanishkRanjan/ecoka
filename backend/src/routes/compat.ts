import { Router } from 'express';
export const compatRouter = Router();
compatRouter.get('/', (_req, res) => res.json({ stub: true }));
