"use client";
import { englishUnit } from "@/i18n/presentation";
import { useLocale } from "@/i18n/LocaleProvider";
import { observationAvailability } from "@/lib/observationAvailability";

export function DataAvailabilitySummary({ points, from, to, unit, frequency, formatPeriod = String, onUseAvailable }: {
  points: { period: number; value: number | null; status?: string }[]; from?: number; to?: number; unit: string; frequency: "annual" | "monthly";
  formatPeriod?: (p: number) => string; onUseAvailable: () => void;
}) {
  const en = useLocale() === "en", t = (zh: string, text: string) => en ? text : zh;
  const a = observationAvailability(points, from, to);
  const restriction = (value: string) => (({not_applicable:t("按登记定义不适用", "Not applicable under the registered definition"),definition_mismatch:t("统计定义不匹配，不能作同口径比较", "Statistical definitions do not match for comparison")} as Record<string,string>)[value] ?? value);
  return <section className="editorial-panel mt-4 p-4 text-sm space-y-2" data-availability-summary>
    <h3 className="font-semibold">{t("观测可用期", "Observation availability")}</h3>
    <p>{t("已发布覆盖", "Published coverage")}: {a.first === null ? "—" : formatPeriod(a.first)} → {a.last === null ? "—" : formatPeriod(a.last)} · {a.count} {t("个不同观测时期", "distinct observation periods")} · {frequency === "annual" ? t("年度", "Annual") : t("月度", "Monthly")} · {en ? englishUnit(unit) : unit}</p>
    <p>{t("覆盖范围内缺失时期", "Missing periods within published coverage")}: {a.first === null ? t("无可确认覆盖", "No established coverage") : a.insideMissing.length ? a.insideMissing.map(formatPeriod).join(", ") : t("无", "None")}</p>
    <p data-selection-coverage>{t("所选范围内可用时期", "Available periods in selection")}: {a.selectedCount} · {t("所选范围在覆盖外的时期数", "Selected periods outside coverage")}: {a.outside ?? "—"}</p>
    {a.invalid ? <p role="status">{t("日期无效或起始时期晚于结束时期。请修改日期。", "The dates are invalid or the start is after the end. Adjust the dates.")}</p> : null}
    {!a.selectedCount ? <p role="status">{t("所选时期没有已发布观测；这不表示没有缺失数据。请求日期保持不变。", "No published observations in the selected period. This does not mean there are no missing data. Requested dates are unchanged.")}</p> : null}
    {a.first !== null && a.last !== null ? <button className="text-[var(--accent)] underline font-semibold" type="button" onClick={onUseAvailable}>{frequency === "monthly" ? t("使用有已发布观测的年份", "Use years with published observations") : t("使用已发布覆盖区间", "Use published coverage")}</button> : null}
    {frequency === "monthly" ? <p className="text-xs text-[var(--muted)]">{t("年份筛选按一月至十二月计算；只绘制实际已发布月份，覆盖外月份单独计数。", "Year filters use January–December boundaries. Only published months are plotted; months outside coverage are counted separately.")}</p> : null}
    {a.pending.length ? <p>{t("待发布或待接入记录（原因见来源详情）", "Pending publication or admission (see source details)")}: {a.pending.map(formatPeriod).join(", ")}</p> : null}
    {a.restrictions.length ? <p>{t("已记录的断点或适用性限制", "Recorded breaks or applicability restrictions")}: {a.restrictions.map(restriction).join("; ")}</p> : null}
    <p className="text-xs text-[var(--muted)]">{t("覆盖外、范围内缺失与待接入是不同状态。未记录具体原因时，不推断为官方尚未发布；方法及来源限制仍见观测详情。", "Outside coverage, gaps within coverage and Pending are distinct. Without recorded evidence, absence is not attributed to delayed publication. Definitions and source restrictions remain in observation details.")}</p>
  </section>;
}
