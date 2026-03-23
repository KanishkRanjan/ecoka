interface Props { score: number; size?: 'sm' | 'md' }

export default function EcoBadge({ score, size = 'md' }: Props) {
  const tier = score >= 75 ? 'Excellent' : score >= 55 ? 'Good' : score >= 35 ? 'Fair' : 'Low';
  const color =
    score >= 75 ? 'bg-eco-700 text-white' :
    score >= 55 ? 'bg-eco-500 text-white' :
    score >= 35 ? 'bg-amber-500 text-white' : 'bg-slate-300 text-slate-700';
  const cls = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${color} ${cls}`}>
      <span>Eco {score}</span>
      <span className="opacity-80">· {tier}</span>
    </span>
  );
}
