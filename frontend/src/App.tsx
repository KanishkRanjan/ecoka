import { Link, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import ProductPage from './pages/Product';
import Compare from './pages/Compare';
import Cart from './pages/Cart';

export default function App() {
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-8">
          <Link to="/" className="text-xl font-bold tracking-tight">
            ECOKA<span className="text-eco-500">.</span>
          </Link>
          <nav className="flex gap-6 text-sm text-slate-600">
            <Link to="/" className="hover:text-ink">Discover</Link>
            <Link to="/compare" className="hover:text-ink">Compare</Link>
            <Link to="/cart" className="hover:text-ink">Cart</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/p/:slug" element={<ProductPage />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/cart" element={<Cart />} />
        </Routes>
      </main>
      <footer className="border-t border-slate-200 py-6 text-sm text-slate-500">
        <div className="max-w-7xl mx-auto px-6">
          ECOKA — built from idea.md. Eco-Score reflects repairability, energy efficiency, and carbon footprint.
        </div>
      </footer>
    </div>
  );
}
