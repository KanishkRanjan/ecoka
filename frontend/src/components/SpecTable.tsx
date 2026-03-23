interface Props { specs: Record<string, any>; highlight?: Set<string> }

export default function SpecTable({ specs, highlight }: Props) {
  return (
    <table className="w-full text-sm">
      <tbody>
        {Object.entries(specs).map(([k, v]) => (
          <tr key={k} className="border-b border-slate-100 last:border-0">
            <td className="py-2 pr-4 text-slate-500 capitalize w-1/3">{k}</td>
            <td className={`py-2 ${highlight?.has(k) ? 'font-semibold text-ink' : ''}`}>
              {Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
