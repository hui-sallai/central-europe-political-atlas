import { dataStatusMeta, type DataStatusKind } from "@/lib/dataStatusLabels";

type DataStatusBadgeProps = {
  status: DataStatusKind;
  className?: string;
};

const statusClassName: Record<DataStatusKind, string> = {
  official: "border-emerald-200 bg-emerald-50 text-emerald-800",
  manual: "border-sky-200 bg-sky-50 text-sky-800",
  sample: "border-amber-200 bg-amber-50 text-amber-800",
  pending: "border-slate-200 bg-slate-50 text-slate-700",
  model: "border-violet-200 bg-violet-50 text-violet-800",
  missing: "border-rose-200 bg-rose-50 text-rose-800",
};

export function DataStatusBadge({ status, className = "" }: DataStatusBadgeProps) {
  const meta = dataStatusMeta[status];

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold leading-none ${statusClassName[status]} ${className}`}
      title={meta.description}
    >
      {meta.label}
    </span>
  );
}
