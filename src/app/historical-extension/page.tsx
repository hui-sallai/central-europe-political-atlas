import type { Metadata } from "next";
import Link from "next/link";
import hicp from "@/data/historical-extension-audit/historical_hicp_extension_audit.json";
import ipi from "@/data/historical-extension-audit/historical_ipi_extension_audit.json";
import unemployment from "@/data/historical-extension-audit/historical_unemployment_extension_audit.json";
import yieldAudit from "@/data/historical-extension-audit/historical_yield_extension_audit.json";
import readiness from "@/data/historical-extension-audit/historical_extension_readiness.json";

export const metadata: Metadata = {
  title: "历史月度数据延伸审计",
  description: "八国四指标的历史可用性、定义可比性和信息支持审计；尚未启用历史 Panel LP。",
};

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
      <p className="editorial-kicker">Research audit / 2026-09-26</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] md:text-5xl">历史月度数据能延伸多远？</h1>
      <p className="mt-5 max-w-4xl text-base leading-8 text-[var(--muted)]">这是公开的可行性审计，不是新的 Panel LP 估计，也不是历史样本获准启用的声明。当前正式 v1.82 的 2015 年起始样本、系数、标准误、区间和联合推断结案状态均未改变。</p>
      <p className="mt-3 text-sm font-semibold">审计状态：{readiness.state === "partial" ? "部分完成；尚无获准的八国四指标历史共同起点" : readiness.state}</p>
    </header>

    <section className="max-w-5xl border-b border-[var(--line)] py-10">
      <p className="editorial-kicker">01 / Definitions</p>
      <h2 className="mt-3 text-3xl font-semibold">数据存在，不等于定义兼容</h2>
      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">Eurostat 最新修订序列在 2015 年前已有月度值。HICP 总指数已核清八国历史序列；工业生产指数核清六国；失业率仅核清捷克。收益率的国家债券篮子与来源转换仍待核清。未核清的单元保留为待审，不以插值或相邻国家数据填补。</p>
      <div className="mt-6 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b border-[var(--line)]"><th className="py-3 pr-5">指标</th><th className="py-3 pr-5">国家</th><th className="py-3 pr-5">最早有值</th><th className="py-3 pr-5">已核清起点</th></tr></thead><tbody>{outcomes.flatMap((outcome) => countries.map((country) => {
        const record = outcome.records.find((item) => item.country === country);
        return <tr key={`${outcome.label}-${country}`} className="border-b border-[var(--line)]"><td className="py-2 pr-5">{outcome.label}</td><td className="py-2 pr-5">{country}</td><td className="py-2 pr-5">{record?.earliest_available ?? "—"}</td><td className="py-2 pr-5">{record?.earliest_definition_compatible ?? "待核清"}</td></tr>;
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
      <p className="editorial-kicker">03 / Open questions</p>
      <h2 className="mt-3 text-3xl font-semibold">下一步仍需核查</h2>
      <p className="mt-4 text-sm leading-7 text-[var(--muted)]">波兰工业生产统计单位转换、罗马尼亚工业生产早期可比性、多国失业率断点及 IESS 修订、各国长期债券收益率的来源与篮子转换。完成这些核查后，才可判断是否存在定义兼容的 Design A 时间窗；新的历史 Panel LP 研究需要另行预注册和负责人决定。</p>
      <div className="mt-6 flex flex-wrap gap-4 text-sm font-semibold text-[var(--accent)]"><Link href="/methodology">正式方法与推断边界</Link><a href={`${basePath}/research-data/research-data-v1.82.zip`}>下载研究数据包与审计记录</a><a href="https://ec.europa.eu/eurostat/cache/metadata/en/une_rt_m_esms.htm">Eurostat 失业率元数据</a></div>
    </section>
  </main>;
}
