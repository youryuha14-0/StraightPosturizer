interface ScoreCardProps {
  label: string;
  score: number | null;
  primary?: boolean;
}

function scoreColor(score: number): string {
  if (score >= 85) return '#10B981'; // neonGreen
  if (score >= 70) return '#FBBF24'; // neonYellow
  return '#EF4444'; // neonRed
}

/**
 * Compact posture score readout with a colored progress bar.
 * `primary` renders the larger "overall" variant.
 */
export default function ScoreCard({ label, score, primary = false }: ScoreCardProps) {
  const hasScore = score !== null;
  const value = hasScore ? Math.round(score as number) : 0;
  const color = hasScore ? scoreColor(value) : '#6B7280';

  return (
    <div className={`glass-panel rounded-2xl p-4 ${primary ? 'sm:p-6' : ''}`}>
      <div className="flex items-baseline justify-between">
        <span className={`text-zinc-400 ${primary ? 'text-sm font-medium' : 'text-xs'}`}>{label}</span>
        <span
          className={`font-semibold tabular-nums ${primary ? 'text-4xl' : 'text-2xl'}`}
          style={{ color }}
        >
          {hasScore ? value : '--'}
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
