"use client";

import { useEffect, useMemo, useState } from "react";
import type { NetworkMetric } from "@/types/NetworkAnalysis";
import type { Country } from "@/types/Country";

type TopPartner = { partner: string; iso3: string | null; value: number; share: number };
type CoverageRecord = {
  coverage_ratio?: number | null;
  eligible_coverage_ratio?: number | null;
  raw_coverage_ratio?: number | null;
  gate_passed: boolean;
  threshold: number;
  world_total: number | null;
  partner_sum?: number;
  eligible_partner_sum?: number;
};
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

const partnerNameZh: Record<string, string> = {
  china: "中国", germany: "德国", poland: "波兰", hungary: "匈牙利", romania: "罗马尼亚", czechia: "捷克",
  slovakia: "斯洛伐克", slovenia: "斯洛文尼亚", serbia: "塞尔维亚", austria: "奥地利", croatia: "克罗地亚",
  france: "法国", italy: "意大利", netherlands: "荷兰", "united-states": "美国", "united-kingdom": "英国",
  spain: "西班牙", belgium: "比利时", "russian-federation": "俄罗斯", ukraine: "乌克兰", turkiye: "土耳其",
};

function displayPartner(partner: TopPartner) {
  return partnerNameZh[partner.partner] ?? partner.partner;
}

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
  return `${(value / 1e9).toLocaleString("zh-CN", { maximumFractionDigits: 1 })} 十亿美元`;
}

function coverageRatioOf(group: UiPackGroup) {
  return group.coverage?.eligible_coverage_ratio ?? group.coverage?.coverage_ratio ?? null;
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

  const groupUsable = Boolean(group?.metrics && group.coverage?.gate_passed);

  const comparisonRows: Array<[string, string, string]> = [];
  if (group?.metrics && compareGroup?.metrics) {
    const left = group.metrics;
    const right = compareGroup.metrics;
    comparisonRows.push(
      ["伙伴集中度 HHI", left.partner_hhi.toFixed(4), right.partner_hhi.toFixed(4)],
      ["最大伙伴份额", percent(left.top_partner_share), percent(right.top_partner_share)],
      ["中国贸易份额", percent(left.china_share), percent(right.china_share)],
      ["德国贸易份额", percent(left.germany_share), percent(right.germany_share)],
      ["伙伴多样化", left.diversification.toFixed(4), right.diversification.toFixed(4)],
      ["名义贸易额（当年美元）", billions(left.weighted_trade_volume), billions(right.weighted_trade_volume)],
      ["伙伴数量", String(left.partner_count), String(right.partner_count)],
    );
  }

  return (
    <div className="mt-6 grid gap-6">
      <section className="editorial-panel p-5">
        <p className="editorial-kicker">UN Comtrade · TOTAL goods · 2015–2025</p>
        <h2 className="mt-2 text-2xl font-semibold">贸易网络分析 Trade Network Analysis</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--muted)]">基于十国完整双边货物贸易伙伴边（进出口）的描述性集中度分析。当前只分析双边货物贸易，不涉及投资、企业或多层网络。聚合记录（World、Other … nes、Areas nes）保留在原始数据中，但不进入网络节点，也不帮助覆盖闸门通过。</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold text-[var(--muted)]">国家<select className="field-control mt-2" value={country} onChange={(event) => setCountry(event.target.value)}>{countries.map((item) => <option key={item.slug} value={item.slug}>{item.name_zh} / {item.name}</option>)}</select></label>
          <label className="text-xs font-semibold text-[var(--muted)]">年份<select className="field-control mt-2" value={year} onChange={(event) => setYear(Number(event.target.value))}>{years.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="text-xs font-semibold text-[var(--muted)]">贸易流向<select className="field-control mt-2" value={flow} onChange={(event) => setFlow(event.target.value as "exports" | "imports")}><option value="exports">出口</option><option value="imports">进口</option></select></label>
          <label className="text-xs font-semibold text-[var(--muted)]">对比国家<select className="field-control mt-2" value={compareWith} onChange={(event) => setCompareWith(event.target.value)}><option value="">不比较</option>{countries.filter((item) => item.slug !== country).map((item) => <option key={item.slug} value={item.slug}>{item.name_zh}</option>)}</select></label>
        </div>
        {loadState === "loading" ? <p className="mt-4 text-sm text-[var(--muted)]">正在加载贸易网络数据…</p> : null}
        {loadState === "error" ? <p className="mt-4 border-l-4 border-[var(--warning)] bg-amber-50 px-4 py-3 text-sm">网络数据不可用：本地数据文件未能加载，请稍后重试或查看研究数据包。</p> : null}
      </section>

      {loadState === "ready" && group && !groupUsable ? (
        <p className="border-y border-[var(--line)] py-8 text-center text-sm text-[var(--muted)]">数据覆盖不足，当前组合不可用于正式网络指标。<span className="mt-1 block text-xs">（该国家 × 年份 × 流向的有效伙伴覆盖率低于 95% 最低要求；不会自动退回更宽口径。）</span></p>
      ) : null}

      {groupUsable && group?.metrics ? (
        <section className="editorial-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--line)] pb-4">
            <div>
              <p className="editorial-kicker">{countryName(country)} · {year} · {flow === "exports" ? "出口" : "进口"}</p>
              <h3 className="mt-2 text-xl font-semibold">贸易伙伴集中度</h3>
            </div>
            {group.coverage ? (
              <p className="text-xs font-semibold text-[var(--muted)]">数据覆盖率：{coverageRatioOf(group) === null ? "—" : `${(coverageRatioOf(group)! * 100).toFixed(1)}%`} · 最低要求：{(group.coverage.threshold * 100).toFixed(0)}% · 状态：{group.coverage.gate_passed ? "数据条件满足" : "数据条件不足"}</p>
            ) : null}
          </div>
          <dl className="mt-5 grid gap-px overflow-hidden border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3 lg:grid-cols-7">
            {([
              ["伙伴集中度 HHI", group.metrics.partner_hhi.toFixed(4)],
              ["最大伙伴", `${displayPartner({ partner: group.metrics.top_partner ?? "", iso3: null, value: 0, share: 0 })} ${percent(group.metrics.top_partner_share)}`],
              ["中国贸易份额", percent(group.metrics.china_share)],
              ["德国贸易份额", percent(group.metrics.germany_share)],
              ["伙伴多样化", group.metrics.diversification.toFixed(4)],
              ["名义贸易额（当年美元）", billions(group.metrics.weighted_trade_volume)],
              ["伙伴数量", String(group.metrics.partner_count)],
            ] as Array<[string, string]>).map(([label, value]) => (
              <div key={label} className="bg-white p-3"><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="metric-number mt-1 text-sm font-semibold">{value}</dd></div>
            ))}
          </dl>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold">贸易伙伴网络图（连线宽度 = 贸易份额）</p>
              <svg viewBox="0 0 380 380" className="mt-3 w-full max-w-[420px]" role="img" aria-label={`${countryName(country)} ${year} 年${flow === "exports" ? "出口" : "进口"}伙伴网络图`}>
                {graphNodes.map((partner, index) => {
                  const angle = (index / graphNodes.length) * 2 * Math.PI - Math.PI / 2;
                  const x = graphCenter + graphRadius * Math.cos(angle);
                  const y = graphCenter + graphRadius * Math.sin(angle);
                  return (
                    <g key={partner.partner}>
                      <line x1={graphCenter} y1={graphCenter} x2={x} y2={y} stroke={partnerColor(partner, country)} strokeWidth={Math.max(1, partner.share * 40)} opacity={0.65} />
                      <circle cx={x} cy={y} r={7} fill={partnerColor(partner, country)} />
                      <text x={x} y={y - 12} textAnchor="middle" fontSize="10" fill="var(--foreground)">{displayPartner(partner)}</text>
                      <text x={x} y={y + 18} textAnchor="middle" fontSize="9" fill="var(--muted)">{percent(partner.share)}</text>
                    </g>
                  );
                })}
                <circle cx={graphCenter} cy={graphCenter} r={12} fill="var(--foreground)" />
                <text x={graphCenter} y={graphCenter + 28} textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--foreground)">{countryName(country)}</text>
              </svg>
              <p className="mt-2 text-xs leading-6 text-[var(--muted)]">颜色有明确定义：深色 = 报告国，红色 = 中国，蓝色 = 欧盟伙伴，灰色 = 其他伙伴。</p>
            </div>
            <div>
              <p className="text-sm font-semibold">主要贸易伙伴</p>
              <table className="research-data-table mt-3 w-full text-left text-sm">
                <thead><tr>{["伙伴", "份额", "名义贸易额"].map((item) => <th key={item} className="px-2 py-2">{item}</th>)}</tr></thead>
                <tbody>
                  {group.top_partners.map((partner) => (
                    <tr key={partner.partner}>
                      <td className="px-2 py-2 font-semibold"><span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: partnerColor(partner, country) }} />{displayPartner(partner)}</td>
                      <td className="metric-number px-2 py-2">{percent(partner.share)}</td>
                      <td className="metric-number px-2 py-2">{billions(partner.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-sm font-semibold">历史变化（2015–2025，HHI 与中国贸易份额；名义值，非实际增长）</p>
            <svg viewBox="0 0 680 160" className="mt-3 w-full" role="img" aria-label={`${countryName(country)} HHI 与中国贸易份额历史变化`}>
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
                    <text x={110} y={16} fontSize="10" fill="var(--accent)">— 中国贸易份额</text>
                  </>
                );
              })() : null}
            </svg>
          </div>

          {compareGroup?.metrics ? (
            <div className="mt-6 border-t border-[var(--line)] pt-5">
              <p className="text-sm font-semibold">{countryName(country)} 对比 {countryName(compareWith)} · {year} · {flow === "exports" ? "出口" : "进口"}（同年份 / 同流向 / 同口径）</p>
              <table className="research-data-table mt-3 w-full text-left text-sm">
                <thead><tr>{["指标", countryName(country), countryName(compareWith)].map((item) => <th key={item} className="px-2 py-2">{item}</th>)}</tr></thead>
                <tbody>{comparisonRows.map(([label, left, right]) => <tr key={label}><td className="px-2 py-2 font-semibold">{label}</td><td className="metric-number px-2 py-2">{left}</td><td className="metric-number px-2 py-2">{right}</td></tr>)}</tbody>
              </table>
            </div>
          ) : null}

          <p className="mt-5 text-xs leading-6 text-[var(--muted)]">数据溯源：UN Comtrade（comtradeplus.un.org）· 来源可靠性 A · {group.partner_count} 条有效伙伴边 · schema {pack?.schema_version} · 生成于 {pack?.generated_at}</p>
          <p className="mt-2 text-xs leading-6 text-[var(--muted)]">{pack?.interpretation_boundary}</p>
        </section>
      ) : null}
    </div>
  );
}
