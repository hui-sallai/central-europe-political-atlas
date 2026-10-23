type SeriesPoint = { label: string; value: number | null };

export function Sparkline({ values, label }: { values: SeriesPoint[]; label: string }) {
  const numeric = values.filter((item): item is { label: string; value: number } => item.value !== null);
  if (numeric.length < 2) return <p className="chart-empty">时间序列不足</p>;
  const min = Math.min(...numeric.map((item) => item.value));
  const max = Math.max(...numeric.map((item) => item.value));
  const range = max - min || 1;
  const years = values.map(item => Number(item.label));
  const calendar = years.every(Number.isFinite) && Math.max(...years) > Math.min(...years);
  const segments: string[][] = [[]];
  values.forEach((item, index) => {
    if (item.value === null || !Number.isFinite(item.value)) { segments.push([]); return; }
    const x = calendar ? (years[index] - Math.min(...years)) / (Math.max(...years) - Math.min(...years)) * 100 : index / Math.max(1, values.length - 1) * 100;
    const y = 30 - ((item.value - min) / range) * 26;
    if (calendar && index > 0 && years[index] - years[index - 1] > 1) segments.push([]);
    segments.at(-1)!.push(`${x},${y}`);
  });

  return (
    <figure className="sparkline" aria-label={label}>
      <svg viewBox="0 0 100 32" role="img" aria-label={label} preserveAspectRatio="none">
        {segments.filter(s => s.length).map((points, i) => <polyline key={i} points={points.join(" ")} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />)}
      </svg>
      <figcaption>{numeric[0].label}–{numeric.at(-1)?.label}</figcaption>
    </figure>
  );
}

export function BarMeter({ value, max = 100, label }: { value: number; max?: number; label: string }) {
  const width = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="bar-meter" role="img" aria-label={`${label}: ${value}`}>
      <span style={{ width: `${width}%` }} />
    </div>
  );
}
