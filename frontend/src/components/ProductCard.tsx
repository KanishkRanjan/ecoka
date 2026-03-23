import { Link } from 'react-router-dom';
import type { Product } from '../api';
import { formatPrice } from '../api';
import EcoBadge from './EcoBadge';

export default function ProductCard({ p }: { p: Product }) {
  return (
    <Link
      to={`/p/${p.slug}`}
      className="group rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-sm transition p-5 flex flex-col gap-3 bg-white"
    >
      <div className="aspect-square bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 text-4xl">
        {p.brand[0]}
      </div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">{p.brand}</div>
          <div className="font-semibold leading-tight">{p.name}</div>
        </div>
        <EcoBadge score={p.ecoScore} size="sm" />
      </div>
      <div className="flex items-center justify-between mt-auto">
        <span className="font-semibold">{formatPrice(p.priceCents)}</span>
        {p.condition === 'REFURBISHED_CERTIFIED' && (
          <span className="text-xs text-eco-700 bg-eco-500/10 rounded-full px-2 py-0.5">Refurb</span>
        )}
      </div>
    </Link>
  );
}
