"use client";

import { useEffect, useMemo, useState } from "react";
import type { NetworkMetric } from "@/types/NetworkAnalysis";
import type { Country } from "@/types/Country";

type TopPartner = { partner: string; iso3: string | null; value: number; share: number };
type CoverageRecord = { coverage_ratio: number | null; gate_passed: boolean; threshold: number; world_total: number | null; partner_sum: number };
type UiPackGroup = {
  reporter: string;
  year: number;
  flow: "exports" | "imports";
  partner_count: number;
  metrics: NetworkMetric | null;
  coverage: CoverageRecord | null;
  top_partners: TopPartner[];
};
type UiPack = { schema_version: string; generated_at: string; interpretation_boundary: string; records: UiPackGroup[] };

const EU_ISO3 = new Set(["AUT", "BEL", "BGR", "HRV", "CYP", "CZE", "DNK", "EST", "FIN", "FRA", "DEU", "GRC", "HUN", "IRL", "ITA", "LVA", "LTU", "LUX", "MLT", "NLD", "POL", "PRT", "ROU", "SVK", "SVN", "ESP", "SWE"]);

function partnerColor(partner: TopPartner, reporter: string) {
  if (partner.partner === reporter) return "var(--foreground)";
  if (partner.partner === "china") return "var(--accent)";
  if (partner.iso3 && EU_ISO3.has(partner.iso3)) return "#2f5d8a";
  return "var(--muted)";
}

function percent(value: number | null) {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`;
}

function billions(value: number) {
  return `$${(value / 1e9).toLocaleString("zh-CN", { maximumFractionDigits: 1 })}B`;
}

export function TradeNetworkWorkbench({ countries }: { countries: Country[] }) {
  const [pack, setPack] = useState<UiPack | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [country, setCountry] = useState("hungary");
  const [year, setYear] = useState(2024);
  const [flow, setFlow] = useState<"exports" | "imports">("imports");
  const [compareWith, setCompareWith] = useState<string>("");

  useEffect(() => {
    const controller = new AbortController();
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    fetch(`${basePath}/research-data/network_ui_pack.json`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error(String(response.status)); return response.json(); })
      .then((payload: UiPack) => { setPack(payload); setLoadState("ready"); })
      .catch((loadError) => { if (!(loadError instanceof DOMException && loadError.name === "AbortError")) setLoadState("error"); });
    return () => controller.abort();
  }, []);

  const group = useMemo(() => pack?.records.find((item) => item.reporter === country && item.year === year && item.flow === flow) ?? null, [pack, country, year, flow]);
  const compareGroup = useMemo(() => compareWith ? pack?.records.find((item) => item.reporter === compareWith && item.year === year && item.flow === flow) ?? null : null, [pack, compareWith, year, flow]);
  const trend = useMemo(() => {
    if (!pack) return [];
    return pack.records
      .filter((item) => item.reporter === country && item.flow === flow && item.metrics)
      .sort((a, b) => a.year - b.year);
  }, [pack, country, flow]);

  const countryName = (slug: string) => countries.find((item) => item.slug === slug)?.name_zh ?? slug;
  const years = pack ? [...new Set(pack.records.map((item) => item.year))].sort((a, b) => b - a) : [];

  const graphNodes = group ? group.top_partners.slice(0, 12) : [];
  const graphRadius = 150;
  const graphCenter = 190;

  const comparisonRows: Array<[string, string, string]> = [];
  if (group?.metrics && compareGroup?.metrics) {
    const left = group.metrics;
    const right = compareGroup.metrics;
    comparisonRows.push(
      ["Partner HHI", left.partner_hhi.toFixed(4), right.partner_hhi.toFixed(4)],
      ["Top partner share", percent(left.top_partner_share), percent(right.top_partner_share)],
      ["China share", percent(left.china_share), percent(right.china_share)],
      ["Germany share", percent(left.germany_share), percent(right.germany_share)],
      ["Diversification", left.diversification.toFixed(4), right.diversification.toFixed(4)],
      ["Weighted trade volume", billions(left.weighted_trade_volume), billions(right.weighted_trade_volume)],
      ["Partner degree ratio", percent(left.partner_degree_ratio), percent(right.partner_degree_ratio)],
    );
  }

  return (
    <div className="mt-6 grid gap-6">
      <section className="editorial-panel p-5">
        <p className="editorial-kicker">Bilateral trade network · UN Comtrade TOTAL goods · 2015–2025</p>
        <h2 className="mt-2 text-2xl font-semibold">Network Analysis</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">基于十国完整双边伙伴边（进出口），输出描述性集中度指标。聚合记录（World、Other … nes、Areas nes）保留在原始数据中但不进入网络节点。</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold text-[var(--muted)]">Country<select className="field-control mt-2" value={country} onChange={(event) => setCountry(event.target.value)}>{countries.map((item) => <option key={item.slug} value={item.slug}>{item.name_zh} / {item.name}</option>)}</select></label>
          <label className="text-xs font-semibold text-[var(--muted)]">Year<select className="field-control mt-2" value={year} onChange={(event) => setYear(Number(event.target.value))}>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="text-xs font-semibold text-[var(--muted)]">Flow<select className="field-control mt-2" value={flow} onChange={(event) => setFlow(event.target.value as "exports" | "imports")}><option value="exports">Exports</option><option value="imports">Imports</option></select></label>
          <label className="text-xs font-semibold text-[var(--muted)]">Compare with（同year/flow/scope）<select className="field-control mt-2" value={compareWith} onChange={(event) => setCompareWith(event.target.value)}><option value="">不比较</option>{countries.filter((item) => item.slug !== country).map((item) => <option key={item.slug} value={item.slug}>{item.name_zh}</option>)}</select></label>
        </div>
        {loadState === "loading" ? <p className="mt-4 text-sm text-[var(--muted)]">Loading network data…</p> : null}
        {loadState === "error" ? <p className="mt-4 border-l-4 border-[var(--warning)] bg-amber-50 px-4 py-3 text-sm">网络数据不可用。</p> : null}
      </section>

      {group?.metrics ? (
        <section className="editorial-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
            <div>
              <p className="editorial-kicker">{countryName(country)} · {year} · {flow}</p>
              <h3 className="mt-2 text-xl font-semibold">Trade concentration</h3>
            </div>
            {group.coverage ? (
              <p className="text-xs font-semibold text-[var(--muted)]">coverage {group.coverage.coverage_ratio === null ? "—" : (group.coverage.coverage_ratio * 100).toFixed(1)}% · threshold {(group.coverage.threshold * 100).toFixed(0)}% · {group.coverage.gate_passed ? "gate passed" : "gate failed"}</p>
            ) : null}
          </div>
          <dl className="mt-5 grid gap-px overflow-hidden border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3 lg:grid-cols-7">
            {([
              ["Partner HHI", group.metrics.partner_hhi.toFixed(4)],
              ["Top partner", `${group.metrics.top_partner ?? "—"} ${percent(group.metrics.top_partner_share)}`],
              ["China share", percent(group.metrics.china_share)],
              ["Germany share", percent(group.metrics.germany_share)],
              ["Diversification", group.metrics.diversification.toFixed(4)],
              ["Weighted volume", billions(group.metrics.weighted_trade_volume)],
              ["Partners", `${group.metrics.partner_count}（degree ratio ${percent(group.metrics.partner_degree_ratio)}）`],
            ] as Array<[string, string]>).map(([label, value]) => (
              <div key={label} className="bg-white p-3"><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="metric-number mt-1 text-sm font-semibold">{value}</dd></div>
            ))}
          </dl>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold">Network graph（edge width = trade share）</p>
              <svg viewBox="0 0 380 380" className="mt-3 w-full max-w-[420px]" role="img" aria-label={`${countryName(country)} ${year} ${flow} partner graph`}>
                {graphNodes.map((partner, index) => {
                  const angle = (index / graphNodes.length) * 2 * Math.PI - Math.PI / 2;
                  const x = graphCenter + graphRadius * Math.cos(angle);
                  const y = graphCenter + graphRadius * Math.sin(angle);
                  return (
                    <g key={partner.partner}>
                      <line x1={graphCenter} y1={graphCenter} x2={x} y2={y} stroke={partnerColor(partner, country)} strokeWidth={Math.max(1, partner.share * 40)} opacity={0.65} />
                      <circle cx={x} cy={y} r={7} fill={partnerColor(partner, country)} />
                      <text x={x} y={y - 12} textAnchor="middle" fontSize="10" fill="var(--foreground)">{partner.partner}</text>
                      <text x={x} y={y + 18} textAnchor="middle" fontSize="9" fill="var(--muted)">{percent(partner.share)}</text>
                    </g>
                  );
                })}
                <circle cx={graphCenter} cy={graphCenter} r={12} fill="var(--foreground)" />
                <text x={graphCenter} y={graphCenter + 28} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--foreground)">{countryName(country)}</text>
              </svg>
              <p className="mt-2 text-xs leading-6 text-[var(--muted)]">颜色有明确定义：深色 = Reporter，红色 = China，蓝色 = EU partner，灰色 = Other。</p>
            </div>
            <div>
              <p className="text-sm font-semibold">Top partners</p>
              <table className="research-data-table mt-3 w-full text-left text-sm">
                <thead><tr>{["Partner", "Share", "Value"].map((item) => <th key={item} className="px-2 py-2">{item}</th>)}</tr></thead>
                <tbody>
                  {group.top_partners.map((partner) => (
                    <tr key={partner.partner}>
                      <td className="px-2 py-2 font-semibold"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: partnerColor(partner, country) }} />{partner.partner}</td>
                      <td className="metric-number px-2 py-2">{percent(partner.share)}</td>
                      <td className="metric-number px-2 py-2">{billions(partner.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold">Historical trend（2015–2025，HHI 与 China share）</p>
            <svg viewBox="0 0 680 160" className="mt-3 w-full" role="img" aria-label="HHI and China share trend">
              {trend.length > 1 ? (() => {
                const values = trend.map((item) => item.metrics!.partner_hhi);
                const chinaValues = trend.map((item) => item.metrics!.china_share ?? 0);
                const maxValue = Math.max(...values, ...chinaValues, 0.05);
                const point = (index: number, value: number) => `${40 + (index / (trend.length - 1)) * 600},${130 - (value / maxValue) * 110}`;
                const hhiPoints = trend.map((item, index) => point(index, item.metrics!.partner_hhi)).join(" ");
                const chinaPoints = trend.map((item, index) => point(index, item.metrics!.china_share ?? 0)).join(" ");
                return (
                  <>
                    <polyline points={hhiPoints} fill="none" stroke="var(--foreground)" strokeWidth="2" />
                    <polyline points={chinaPoints} fill="none" stroke="var(--accent)" strokeWidth="2" />
                    {trend.map((item, index) => <text key={item.year} x={40 + (index / (trend.length - 1)) * 600} y={150} textAnchor="middle" fontSize="9" fill="var(--muted)">{item.year}</text>)}
                    <text x={44} y={16} fontSize="10" fill="var(--foreground)">— HHI</text>
                    <text x={110} y={16} fontSize="10" fill="var(--accent)">— China share</text>
                  </>
                );
              })() : null}
            </svg>
          </div>

          {compareGroup?.metrics ? (
            <div className="mt-6 border-t border-[var(--line)] pt-5">
              <p className="text-sm font-semibold">{countryName(country)} vs {countryName(compareWith)} · {year} · {flow}（同 year / flow / scope）</p>
              <table className="research-data-table mt-3 w-full text-left text-sm">
                <thead><tr>{["Metric", countryName(country), countryName(compareWith)].map((item) => <th key={item} className="px-2 py-2">{item}</th>)}</tr></thead>
                <tbody>{comparisonRows.map(([label, left, right]) => <tr key={label}><td className="px-2 py-2 font-semibold">{label}</td><td className="metric-number px-2 py-2">{left}</td><td className="metric-number px-2 py-2">{right}</td></tr>)}</tbody>
              </table>
            </div>
          ) : null}

          <p className="mt-5 text-xs leading-6 text-[var(--muted)]">Data trace: UN Comtrade（comtradeplus.un.org）· source reliability A · {group.partner_count} eligible partner edges · schema {pack?.schema_version} · generated {pack?.generated_at}</p>
          <p className="mt-2 text-xs leading-6 text-[var(--muted)]">{pack?.interpretation_boundary}</p>
        </section>
      ) : loadState === "ready" ? (
        <p className="border-y border-[var(--line)] py-8 text-center text-sm text-[var(--muted)]">该 country / year / flow 组合没有通过覆盖闸门的记录。</p>
      ) : null}
    </div>
  );
}
