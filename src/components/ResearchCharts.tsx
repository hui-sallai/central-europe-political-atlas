type SeriesPoint = { label: string; value: number | null };

export function Sparkline({ values, label }: { values: SeriesPoint[]; label: string }) {
  const numeric = values.filter((item): item is { label: string; value: number } => item.value !== null);
  if (numeric.length < 2) return <p className="chart-empty">时间序列不足</p>;
  const min = Math.min(...numeric.map((item) => item.value));
  const max = Math.max(...numeric.map((item) => item.value));
  const range = max - min || 1;
  const points = numeric.map((item, index) => {
    const x = numeric.length === 1 ? 0 : (index / (numeric.length - 1)) * 100;
    const y = 30 - ((item.value - min) / range) * 26;
    return `${x},${y}`;
  }).join(" ");

  return (
    <figure className="sparkline" aria-label={label}>
      <svg viewBox="0 0 100 32" role="img" aria-label={label} preserveAspectRatio="none">
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption>{numeric[0].label}–{numeric.at(-1)?.label}</figcaption>
    </figure>
  );
}

export function BarMeter({ value, max = 100, label }: { value: number; max?: number; label: string }) {
  const width = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="bar-meter" aria-label={`${label}: ${value}`}>
      <span style={{ width: `${width}%` }} />
    </div>
  );
}

export function ChartPlaceholder({ type, note }: { type: "coefficient" | "distribution" | "network"; note: string }) {
  return (
    <div className={`chart-placeholder chart-placeholder-${type}`}>
      <span>{type}</span>
      <p>{note}</p>
    </div>
  );
}
