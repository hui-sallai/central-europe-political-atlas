type StatusItem = {
  label: string;
  value: string;
  note?: string;
};

type StatusSummaryProps = {
  items: readonly StatusItem[];
  columns?: "three" | "four";
};

export function StatusSummary({ items, columns = "four" }: StatusSummaryProps) {
  return (
    <dl className={`grid gap-3 ${columns === "three" ? "md:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-4"}`}>
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
          <dt className="text-xs font-semibold text-[var(--muted)]">{item.label}</dt>
          <dd className="mt-2 text-sm font-semibold leading-6 text-[var(--foreground)]">{item.value}</dd>
          {item.note ? <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{item.note}</p> : null}
        </div>
      ))}
    </dl>
  );
}
