import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type Product, formatPrice } from '../api';
import EcoBadge from '../components/EcoBadge';
import SpecTable from '../components/SpecTable';
import ProductCard from '../components/ProductCard';

const SESSION_ID = 'demo-session';

export default function ProductPage() {
  const { slug = '' } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [similar, setSimilar] = useState<Product[]>([]);
  const [ecoAlt, setEcoAlt] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.getProduct(slug), api.recommend(slug)])
      .then(([{ product }, { similar, ecoAlt }]) => {
        setProduct(product);
        setSimilar(similar);
        setEcoAlt(ecoAlt);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  function addToCart() {
    if (!product) return;
    api.addToCart(SESSION_ID, product.id).then(() => setAdded(true));
  }

  function addToCompare() {
    if (!product) return;
    const stored: string[] = JSON.parse(localStorage.getItem('ecoka:compare') ?? '[]');
    if (!stored.includes(product.slug)) stored.push(product.slug);
    localStorage.setItem('ecoka:compare', JSON.stringify(stored.slice(-4)));
    alert(`Added to compare. Currently: ${stored.join(', ')}`);
  }

  if (loading || !product) return <div className="text-slate-400">Loading…</div>;

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="aspect-square bg-slate-50 rounded-2xl flex items-center justify-center text-7xl text-slate-300">
          {product.brand[0]}
        </div>
        <div className="space-y-5">
          <div className="text-xs uppercase tracking-wide text-slate-400">{product.brand}</div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-semibold">{formatPrice(product.priceCents)}</span>
            <EcoBadge score={product.ecoScore} />
            {product.condition === 'REFURBISHED_CERTIFIED' && (
              <span className="text-xs text-eco-700 bg-eco-500/10 rounded-full px-2 py-0.5">Eco-Certified Refurb</span>
            )}
          </div>
          <p className="text-slate-600">{product.description}</p>
          <div className="flex gap-3">
            <button onClick={addToCart} className="px-5 py-2.5 rounded-lg bg-ink text-white font-medium">
              {added ? 'Added ✓' : 'Add to cart'}
            </button>
            <button onClick={addToCompare} className="px-5 py-2.5 rounded-lg border border-slate-300 font-medium">
              Add to compare
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
            <Stat label="Repairability" value={`${product.repairabilityScore}/10`} />
            <Stat label="Energy efficiency" value={`${product.energyEfficiency}/10`} />
            <Stat label="Carbon" value={`${product.carbonKg} kg`} />
          </div>
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Specifications</h2>
        <div className="border border-slate-200 rounded-2xl p-5">
          <SpecTable specs={product.specs} />
        </div>
      </section>

      {product.benchmarks && Object.keys(product.benchmarks).length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Benchmarks</h2>
          <div className="border border-slate-200 rounded-2xl p-5">
            <SpecTable specs={product.benchmarks as Record<string, any>} />
          </div>
        </section>
      )}

      {similar.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Similar specs</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {similar.slice(0, 4).map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {ecoAlt.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">Eco-friendly alternatives</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {ecoAlt.slice(0, 4).map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      <Link to="/" className="text-slate-500 hover:text-ink text-sm">← Back to discover</Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}
