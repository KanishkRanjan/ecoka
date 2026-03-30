import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Product, formatPrice } from '../api';
import EcoBadge from '../components/EcoBadge';

const STORAGE_KEY = 'ecoka:compare';

const HIGHER_BETTER = new Set([
  'ramGb', 'cores', 'cudaCores', 'streamProcessors', 'vramGb',
  'storageGb', 'capacityGb', 'refreshHz', 'sizeIn', 'portsCount',
  'seqReadMBs', 'seqWriteMBs', 'battery_h', 'dpi', 'geekbench6', 'cinebench_r23',
  'repairabilityScore', 'energyEfficiency', 'ecoScore',
]);
const LOWER_BETTER = new Set(['priceCents', 'weightKg', 'tdpW', 'carbonKg']);

function bestIndex(values: any[], higher: boolean): number[] {
  const numeric = values.map((v) => (typeof v === 'number' ? v : Number(v)));
  if (numeric.some(Number.isNaN)) return [];
  const target = higher ? Math.max(...numeric) : Math.min(...numeric);
  const winners: number[] = [];
  numeric.forEach((n, i) => { if (n === target) winners.push(i); });
  return winners.length === values.length ? [] : winners;
}

export default function Compare() {
  const [slugs, setSlugs] = useState<string[]>(
    () => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'),
  );
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    Promise.all(slugs.map((s) => api.getProduct(s).then((r) => r.product).catch(() => null)))
      .then((arr) => setProducts(arr.filter(Boolean) as Product[]));
  }, [slugs]);

  function remove(slug: string) {
    const next = slugs.filter((s) => s !== slug);
    setSlugs(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  if (products.length === 0) {
    return (
      <div className="text-slate-500">
        Nothing to compare yet. Open a <Link to="/" className="underline">product</Link> and tap "Add to compare".
      </div>
    );
  }

  // Aggregate all spec keys across products
  const specKeys = new Set<string>();
  for (const p of products) Object.keys(p.specs ?? {}).forEach((k) => specKeys.add(k));

  const renderRow = (label: string, values: any[], higher: boolean | null) => {
    const winners = higher === null ? [] : bestIndex(values, higher);
    return (
      <tr key={label} className="border-b border-slate-100 last:border-0">
        <td className="py-2 pr-4 text-slate-500 text-sm w-44 capitalize">{label}</td>
        {values.map((v, i) => {
          const isWinner = winners.includes(i);
          const isLoser = winners.length > 0 && !isWinner;
          const cls = isWinner ? 'text-eco-700 font-semibold' : isLoser ? 'text-rose-600' : '';
          return (
            <td key={i} className={`py-2 pr-4 text-sm ${cls}`}>
              {Array.isArray(v) ? v.join(', ') : v == null ? '—' : String(v)}
            </td>
          );
        })}
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Compare</h1>
      <div className="overflow-x-auto border border-slate-200 rounded-2xl">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left py-3 px-4 text-xs uppercase tracking-wide text-slate-500">Spec</th>
              {products.map((p) => (
                <th key={p.id} className="text-left py-3 px-4 align-top">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-400">{p.brand}</div>
                      <div className="font-semibold">{p.name}</div>
                      <div className="mt-1"><EcoBadge score={p.ecoScore} size="sm" /></div>
                    </div>
                    <button
                      onClick={() => remove(p.slug)}
                      className="text-xs text-slate-400 hover:text-rose-600"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {renderRow('Price', products.map((p) => formatPrice(p.priceCents)), false)}
            {renderRow('Eco-Score', products.map((p) => p.ecoScore), true)}
            {renderRow('Repairability', products.map((p) => p.repairabilityScore), true)}
            {renderRow('Energy efficiency', products.map((p) => p.energyEfficiency), true)}
            {renderRow('Carbon (kg)', products.map((p) => p.carbonKg), false)}
            {renderRow('Weight (kg)', products.map((p) => p.weightKg), false)}
            {Array.from(specKeys).map((k) => {
              const values = products.map((p) => (p.specs as any)?.[k]);
              const higher = HIGHER_BETTER.has(k) ? true : LOWER_BETTER.has(k) ? false : null;
              return renderRow(k, values, higher);
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400">
        Green = winning value · Red = behind on this spec · Plain = qualitative or tied.
      </p>
    </div>
  );
}
