import { Router } from 'express';
export const advisorRouter = Router();
advisorRouter.post('/', (_req, res) => res.json({ stub: true }));
