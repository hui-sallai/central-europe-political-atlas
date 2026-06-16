import { dataStatusMeta, sourceStatusMeta, type DataStatusKind, type SourceStatusKind } from "@/lib/dataStatusLabels";

type DataStatusBadgeProps = {
  status: DataStatusKind;
  className?: string;
};

const statusClassName: Record<DataStatusKind, string> = {
  official: "border-emerald-200 bg-emerald-50 text-emerald-800",
  manual: "border-sky-200 bg-sky-50 text-sky-800",
  sample: "border-amber-200 bg-amber-50 text-amber-800",
  pending: "border-slate-200 bg-slate-50 text-slate-700",
  missing: "border-slate-200 bg-slate-50 text-slate-700",
};

const sourceClassName: Record<SourceStatusKind, string> = {
  official: "border-emerald-200 bg-white text-emerald-800",
  manual: "border-sky-200 bg-white text-sky-800",
  sample: "border-amber-200 bg-white text-amber-800",
  pending: "border-slate-200 bg-white text-slate-700",
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

export function SourceStatusBadge({ status, className = "" }: { status: SourceStatusKind; className?: string }) {
  const meta = sourceStatusMeta[status];

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold leading-none ${sourceClassName[status]} ${className}`}
      title={meta.description}
    >
      {meta.label}
    </span>
  );
}
