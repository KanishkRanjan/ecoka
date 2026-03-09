import { Router } from 'express';
import { prisma } from '../db';

export const compatRouter = Router();

interface Rule {
  id: string;
  description: string;
  appliesTo: (a: any, b: any) => boolean;
  test: (a: any, b: any) => boolean;
}

const rules: Rule[] = [
  {
    id: 'tb4-monitor-needs-tb4-laptop',
    description: 'Thunderbolt 4 monitor requires a host with a Thunderbolt 4 port',
    appliesTo: (laptop, monitor) =>
      laptop.category === 'LAPTOP' &&
      monitor.category === 'MONITOR' &&
      Array.isArray(monitor.specs?.ports) &&
      monitor.specs.ports.includes('Thunderbolt4'),
    test: (laptop, _monitor) =>
      Array.isArray(laptop.specs?.ports) && laptop.specs.ports.includes('Thunderbolt4'),
  },
  {
    id: 'tb4-dock-needs-tb4-host',
    description: 'Thunderbolt 4 dock requires a Thunderbolt 4 host',
    appliesTo: (laptop, dock) =>
      laptop.category === 'LAPTOP' &&
      dock.category === 'DOCK' &&
      dock.specs?.supportsThunderbolt4 === true,
    test: (laptop, _dock) =>
      Array.isArray(laptop.specs?.ports) && laptop.specs.ports.includes('Thunderbolt4'),
  },
  {
    id: '4k-monitor-recommends-tb4-or-displayport',
    description: '4K monitor benefits from Thunderbolt 4 or DisplayPort on the host',
    appliesTo: (laptop, monitor) =>
      laptop.category === 'LAPTOP' &&
      monitor.category === 'MONITOR' &&
      monitor.specs?.resolution === '3840x2160',
    test: (laptop, _monitor) => {
      const ports: string[] = laptop.specs?.ports ?? [];
      return ports.some((p) => ['Thunderbolt4', 'DisplayPort', 'HDMI', 'USB-C'].includes(p));
    },
  },
];

compatRouter.get('/', async (req, res, next) => {
  try {
    const stack = String(req.query.stack ?? '');
    const item = String(req.query.item ?? '');
    if (!stack || !item) return res.status(400).json({ error: 'missing stack or item' });

    const [a, b] = await Promise.all([
      prisma.product.findUnique({ where: { slug: stack } }),
      prisma.product.findUnique({ where: { slug: item } }),
    ]);
    if (!a || !b) return res.status(404).json({ error: 'not_found' });

    const reasons: Array<{ rule: string; pass: boolean; description: string }> = [];
    for (const r of rules) {
      const applies = r.appliesTo(a, b) || r.appliesTo(b, a);
      if (!applies) continue;
      const pass = r.appliesTo(a, b) ? r.test(a, b) : r.test(b, a);
      reasons.push({ rule: r.id, pass, description: r.description });
    }
    const compatible = reasons.every((r) => r.pass);
    res.json({ compatible, reasons });
  } catch (e) {
    next(e);
  }
});
