import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Product, formatPrice } from '../api';

const SESSION_ID = 'demo-session';

export default function Cart() {
  const [items, setItems] = useState<Array<{ productId: string; qty: number }>>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCents, setTotalCents] = useState(0);
  const [loading, setLoading] = useState(true);

  function refresh() {
    setLoading(true);
    api.getCart(SESSION_ID).then((r) => {
      setItems(r.items);
      setProducts(r.products);
      setTotalCents(r.totalCents);
    }).finally(() => setLoading(false));
  }

  useEffect(refresh, []);

  function remove(productId: string) {
    api.removeFromCart(SESSION_ID, productId).then(refresh);
  }

  if (loading) return <div className="text-slate-400">Loading…</div>;
  if (items.length === 0) {
    return (
      <div className="text-slate-500">
        Cart is empty. <Link to="/" className="underline">Discover products</Link>.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Cart</h1>
      <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100">
        {items.map((it) => {
          const p = products.find((p) => p.id === it.productId);
          if (!p) return null;
          return (
            <div key={it.productId} className="p-4 flex items-center gap-4">
              <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 text-xl">
                {p.brand[0]}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{p.name}</div>
                <div className="text-sm text-slate-500">{p.brand} · qty {it.qty}</div>
              </div>
              <div className="font-semibold">{formatPrice(p.priceCents * it.qty)}</div>
              <button
                onClick={() => remove(p.id)}
                className="text-sm text-slate-400 hover:text-rose-600"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-slate-500">Total</div>
        <div className="text-2xl font-bold">{formatPrice(totalCents)}</div>
      </div>
      <button className="w-full px-5 py-3 rounded-lg bg-ink text-white font-medium">
        Checkout (demo — payments not wired)
      </button>
    </div>
  );
}
