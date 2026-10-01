import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import hicp from "@/data/historical-extension-audit/historical_hicp_extension_audit.json";
import ipi from "@/data/historical-extension-audit/historical_ipi_extension_audit.json";
import unemployment from "@/data/historical-extension-audit/historical_unemployment_extension_audit.json";
import yieldAudit from "@/data/historical-extension-audit/historical_yield_extension_audit.json";
import baselineDefinition from "@/data/historical-extension-audit/baseline_definition_integrity_audit.json";
import conclusion from "@/data/historical-extension-audit/historical_extension_research_conclusion.json";
import { getResearchPackageFilename, PLATFORM_VERSION } from "@/lib/releaseMetadata";

export const metadata: Metadata = pageMetadata({ title: "历史月度数据延伸审计", description: "八国四指标的历史可用性、定义可比性和信息支持审计；尚未启用历史 Panel LP。", path: "/historical-extension/" });

const outcomes = [
  { label: "HICP 价格指数", records: hicp.records },
  { label: "工业生产指数", records: ipi.records },
  { label: "失业率", records: unemployment.records },
  { label: "长期国债收益率", records: yieldAudit.records },
];
const countries = ["AT", "DE", "SK", "SI", "CZ", "HU", "PL", "RO"];

export default function HistoricalExtensionPage() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return <main className="page-shell">
    <header className="max-w-5xl border-b border-[var(--line)] pb-8">
      <p className="editorial-kicker">Research conclusion / 2026-09-27</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">历史月度数据延伸：研究结论</h1>
      <p className="mt-5 max-w-4xl text-base leading-8 text-[var(--muted)]">这是已结束的研究审计，不是新的 Panel LP 估计，也不是历史样本获准启用的声明。当前正式 {PLATFORM_VERSION} 继续保留 2015-01 至 2025-10 的固定八国样本、系数、标准误、区间和联合推断结案状态。</p>
      <p className="mt-3 text-sm font-semibold">当前四指标历史扩展：已结束；固定 8 国四指标设计受阻。</p>
      <p className="mt-2 text-sm leading-7 text-[var(--muted)]">正式样本定义核查：{baselineDefinition.state === "nonblocking_warning" ? "有非阻断性方法警示" : baselineDefinition.state}。波兰工业生产指数在 2021 年由 LEU 转为 KAU；当前样本保留，但不宣称两种统计单位完全一致。</p>
    </header>

    <section className="max-w-5xl border-b border-[var(--line)] py-10">
      <p className="editorial-kicker">01 / Definitions</p>
      <h2 className="mt-3 text-3xl font-semibold">数据存在，不等于定义兼容</h2>
      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">Eurostat 最新修订序列在 2015 年前已有月度值。HICP 和长期收益率已核清八国历史序列；工业生产指数核清六国；失业率核清奥地利、德国、斯洛文尼亚、捷克、匈牙利和罗马尼亚。波兰、罗马尼亚工业生产及斯洛伐克、波兰失业率的更早延伸明确受阻，不以插值或相邻国家数据填补。</p>
      <div className="mt-6 overflow-x-auto" tabIndex={0} role="region" aria-label="数据表（可横向滚动）"><table className="min-w-full text-left text-sm"><thead><tr className="border-b border-[var(--line)]"><th className="py-3 pr-5">指标</th><th className="py-3 pr-5">国家</th><th className="py-3 pr-5">最早有值</th><th className="py-3 pr-5">已核清起点</th></tr></thead><tbody>{outcomes.flatMap((outcome) => countries.map((country) => {
        const record = outcome.records.find((item) => item.country === country);
        return <tr key={`${outcome.label}-${country}`} className="border-b border-[var(--line)]"><td className="py-2 pr-5">{outcome.label}</td><td className="py-2 pr-5">{country}</td><td className="py-2 pr-5">{record?.earliest_available ?? "—"}</td><td className="py-2 pr-5">{record?.earliest_definition_compatible ?? "受阻：无可核清起点"}</td></tr>;
      }))}</tbody></table></div>
      <p className="mt-4 text-xs leading-6 text-[var(--muted)]">“已核清起点”只适用于当前修订版的逐国序列，不表示八国四指标已构成可估计的平衡面板，也不表示实时历史版本可用。</p>
    </section>

    <section className="max-w-5xl border-b border-[var(--line)] py-10">
      <p className="editorial-kicker">02 / Information support</p>
      <h2 className="mt-3 text-3xl font-semibold">更多月份只是潜在信息增量</h2>
      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">当前冻结样本在 h=0 有 129 个有效月份，在 h=24 有 100 个；相应非零 MP 与 CBI 冲击月份分别为 86 和 67。若只按日历做 2009-01 起点的预检，h=24 可能增加 71 个有效月份、两类冲击各增加 69 个非零月份。但 2009 年并非已核清的共同起点，这些数字不是新的估计或统计有效性证据。</p>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">斯洛文尼亚于 2007 年、斯洛伐克于 2009 年加入欧元；保持现有固定欧元组解释的设计不能把加入前月份追溯视为直接受 ECB 政策覆盖。历史延伸也不能改变已结案的全路径联合推断结论。</p>
    </section>

    <section className="max-w-5xl py-10">
      <p className="editorial-kicker">03 / Research conclusion</p>
      <h2 className="mt-3 text-3xl font-semibold">研究结论</h2>
      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">HICP 与长期收益率已经核清；工业生产和失业率仍有终局性定义证据缺口。尚无获准的八国四指标历史共同起点，固定组 Design A 不会启动，当前 2015 基线继续保持。</p>
      <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--muted)]"><li>A：继续使用当前 2015 四指标基线。</li><li>B：缩减结果变量的历史研究必须形成新的研究问题，经负责人批准并重新预注册。</li><li>C：只有出现新的官方协调桥接或来源时才重新评估；这不是当前待办。</li></ul>
      <p className="mt-4 text-xs leading-6 text-[var(--muted)]">机器可读结论：{conclusion.formal_result_decision}；Design A = {conclusion.Design_A_status}；start = null。任何 B / C 方案都不是当前研究计划。</p>
      <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-[var(--accent)]"><Link href="/methodology">正式方法与推断边界</Link><a href={`${basePath}/research-data/${getResearchPackageFilename()}`}>下载研究数据包与审计记录</a><a href="https://ec.europa.eu/eurostat/cache/metadata/en/une_rt_m_esms.htm">Eurostat 失业率元数据</a></div>
    </section>
  </main>;
}
