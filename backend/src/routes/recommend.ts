import { Router } from 'express';
export const recommendRouter = Router();
recommendRouter.get('/', (_req, res) => res.json({ stub: true }));
