import { useState } from 'react';

interface Props {
  initial?: string;
  onSearch: (q: string) => void;
}

export default function SearchBar({ initial = '', onSearch }: Props) {
  const [q, setQ] = useState(initial);
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(q);
      }}
    >
      <input
        className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-eco-500"
        placeholder='Try "4K 144Hz monitor" or "M3 laptop"'
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button className="px-4 py-2 rounded-lg bg-ink text-white font-medium">Search</button>
    </form>
  );
}
