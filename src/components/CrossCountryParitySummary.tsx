import { getExtendedObservationCoverage } from "@/lib/extendedData";
import { researchCountries } from "@/lib/researchData";
import { getTransmissionObservations } from "@/lib/transmissionData";

export function CrossCountryParitySummary() {
  const rows = researchCountries.map((country) => {
    const extended = getExtendedObservationCoverage(country.slug);
    const transmission = getTransmissionObservations(country.slug);
    return {
      slug: country.slug,
      name: country.name_zh,
      extended,
      transmissionPresent: transmission.filter((record) => record.value !== null).length,
      transmissionExpected: 8,
    };
  });
  const extendedPresent = rows.reduce((sum, row) => sum + row.extended.present, 0);
  const extendedExpected = rows.reduce((sum, row) => sum + row.extended.expected, 0);
  const transmissionPresent = rows.reduce((sum, row) => sum + row.transmissionPresent, 0);
  const transmissionExpected = rows.reduce((sum, row) => sum + row.transmissionExpected, 0);

  return (
    <section className="mt-5 card p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">v0.75 Cross-Country Data Parity</p>
          <h2 className="mt-3 text-2xl font-semibold">十国数据深度统一</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--muted)]">
            十国统一使用 12 项扩展指标的 2021–2025 观测格，以及 4 项 transmission 指标的 2023–2024 观测格。数值只来自 Eurostat 与 UN Comtrade；缺失、不适用和未发布位置保持为空。
          </p>
        </div>
        <span className="rounded-full bg-[var(--surface-muted)] px-4 py-2 text-xs font-semibold text-[var(--muted)]">
          A 级来源优先
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["扩展指标结构", "10 国 × 12 项"],
          ["扩展观测值", `${extendedPresent} / ${extendedExpected}`],
          ["Transmission 观测值", `${transmissionPresent} / ${transmissionExpected}`],
          ["缺失值处理", "保留 pending / 不插值"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
            <p className="text-xs font-semibold text-[var(--muted)]">{label}</p>
            <p className="mt-2 text-lg font-semibold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
              {['国家', '扩展指标', '待接入', 'Transmission', '质量状态'].map((header) => (
                <th key={header} className="border-b border-[var(--line)] px-3 pb-3 font-semibold first:pl-0">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.slug}>
                <td className="border-b border-[var(--line)] py-3 pl-0 pr-3 font-semibold">{row.name}</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{row.extended.present} / {row.extended.expected}</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{row.extended.pending}</td>
                <td className="border-b border-[var(--line)] px-3 py-3">{row.transmissionPresent} / {row.transmissionExpected}</td>
                <td className="border-b border-[var(--line)] px-3 py-3 text-xs text-[var(--muted)]">
                  {row.extended.pending === 0 && row.transmissionPresent === row.transmissionExpected ? "完整" : "部分通过；缺失位置已标记"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
