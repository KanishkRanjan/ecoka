const BASE = import.meta.env.VITE_API_BASE ?? '';

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  condition: 'NEW' | 'REFURBISHED_CERTIFIED';
  priceCents: number;
  weightKg: number;
  specs: Record<string, any>;
  repairabilityScore: number;
  energyEfficiency: number;
  carbonKg: number;
  ecoScore: number;
  description: string;
  imageUrl?: string | null;
  benchmarks?: Record<string, any> | null;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

export const api = {
  listProducts: (params: Record<string, string | undefined> = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && q.set(k, v));
    return get<{ products: Product[]; count: number }>(`/api/products?${q}`);
  },
  getProduct: (slug: string) => get<{ product: Product }>(`/api/products/${slug}`),
  recommend: (slug: string) =>
    get<{ similar: Array<Product & { similarity: number }>; ecoAlt: Array<Product & { similarity: number }> }>(
      `/api/recommend/${slug}`,
    ),
  compat: (stack: string, item: string) =>
    get<{ compatible: boolean; reasons: Array<{ rule: string; pass: boolean; description: string }> }>(
      `/api/compat?stack=${stack}&item=${item}`,
    ),
  advise: (query: string) =>
    post<{ products: Product[]; interpretation: any }>(`/api/advisor`, { query }),
  getCart: (sid: string) =>
    get<{ items: Array<{ productId: string; qty: number }>; products: Product[]; totalCents: number }>(
      `/api/cart/${sid}`,
    ),
  addToCart: (sid: string, productId: string) =>
    post<{ items: Array<{ productId: string; qty: number }> }>(`/api/cart/${sid}/add`, { productId }),
  removeFromCart: (sid: string, productId: string) =>
    post<{ items: Array<{ productId: string; qty: number }> }>(`/api/cart/${sid}/remove`, { productId }),
};

export function formatPrice(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}
