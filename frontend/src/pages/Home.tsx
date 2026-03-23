import { useEffect, useState } from 'react';
import { api, type Product } from '../api';
import SearchBar from '../components/SearchBar';
import ProductCard from '../components/ProductCard';

const CATEGORIES = ['LAPTOP', 'MONITOR', 'GPU', 'PHONE', 'TABLET', 'KEYBOARD', 'MOUSE', 'HEADPHONES', 'DOCK', 'SSD'];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<string | undefined>();
  const [refurbishedOnly, setRefurbishedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .listProducts({ q, category, refurbishedOnly: refurbishedOnly ? 'true' : undefined })
      .then((r) => setProducts(r.products))
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, [q, category, refurbishedOnly]);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-4xl font-bold tracking-tight">Tech, without the noise.</h1>
        <p className="text-slate-500 mt-2 max-w-xl">
          Spec-first search, ecosystem compatibility, and an Eco-Score on every product.
        </p>
      </section>

      <SearchBar onSearch={setQ} />

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setCategory(undefined)}
          className={`px-3 py-1 rounded-full text-sm border ${!category ? 'bg-ink text-white border-ink' : 'border-slate-300 text-slate-600'}`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`px-3 py-1 rounded-full text-sm border ${category === c ? 'bg-ink text-white border-ink' : 'border-slate-300 text-slate-600'}`}
          >
            {c.toLowerCase()}
          </button>
        ))}
        <label className="ml-auto inline-flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={refurbishedOnly}
            onChange={(e) => setRefurbishedOnly(e.target.checked)}
          />
          Eco-certified refurbished only
        </label>
      </div>

      {err && <div className="text-rose-600">{err}</div>}
      {loading ? (
        <div className="text-slate-400">Loading…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
