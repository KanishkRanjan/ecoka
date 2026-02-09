import express from 'express';
import cors from 'cors';
import { productsRouter } from './routes/products';
import { compatRouter } from './routes/compat';
import { recommendRouter } from './routes/recommend';
import { advisorRouter } from './routes/advisor';
import { cartRouter } from './routes/cart';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ecoka-backend' });
});

app.use('/api/products', productsRouter);
app.use('/api/compat', compatRouter);
app.use('/api/recommend', recommendRouter);
app.use('/api/advisor', advisorRouter);
app.use('/api/cart', cartRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`ecoka-backend listening on :${port}`);
});
