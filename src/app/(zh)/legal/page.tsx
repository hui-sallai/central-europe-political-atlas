import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import { PLATFORM_CONTACT_EMAIL, PLATFORM_NAME } from "@/lib/releaseMetadata";
import { CONTROLLER_NAME, LEGAL_NOTICES_UPDATED } from "@/content/legalNotices";

export const metadata: Metadata = pageMetadata({ title: "法律、版权与更正说明", description: "平台独立性、研究边界、第三方数据许可、版权、地图署名和更正撤下机制。", path: "/legal/" });

const sections = [
  [
    "独立性与研究目的",
    <p key="independence">{PLATFORM_NAME} 由 {CONTROLLER_NAME}（自然人）运营，是独立、非商业的公开研究项目，不是任何大学或其他机构的官方项目，与欧盟机构、任何国家政府、政党、候选人、企业、新闻机构或数据提供方不存在隶属、授权或背书关系。平台内容用于政治经济研究、事实比较和方法展示，不构成法律、投资、商业或政策建议。</p>,
  ],
  [
    "原创内容与第三方权利",
    <p key="rights">平台原创文字、界面与代码受适用版权规则保护。官方统计、地图边界、新闻事实、商标、机构名称及外部材料仍归各自权利人所有；平台不对这些第三方内容主张所有权。转载平台原创内容时应注明平台名称、版本、页面链接和访问日期。</p>,
  ],
  [
    "地图与空间数据",
    <div key="map" className="grid gap-2"><p>使用 Eurostat/GISCO 数据的地图必须同时保留来源、数据版本和适用许可说明。当前署名为：</p><p className="rounded-xl bg-[var(--surface-muted)] px-4 py-3 font-semibold">来源：European Commission - Eurostat/GISCO；行政边界：© EuroGeographics（Administrative boundaries: © EuroGeographics）。</p><p>相关边界仅用于非商业研究展示。若网站用途变为商业、收费、广告支持或面向客户交付，必须先重新核验许可并在需要时取得 EuroGeographics 的授权。</p></div>,
  ],
  [
    "新闻、事件与引用",
    <p key="news">事件库仅保存原创摘要、结构化编码和来源链接，不以替代原报道为目的。受版权保护的报道、图片、图表和长篇原文不会因被引用而转移权利；如需阅读全文，应访问原始发布者。事实记录、人工整理、推断和模型结果必须分开标注。</p>,
  ],
  [
    "政治人物、政党与个人数据",
    <div key="people" className="grid gap-2"><p>平台不建立个人政治观点画像，不根据个人言论、投票行为、社交媒体、党派关系或其他信息推断自然人的政治观点、意识形态、投票意向或未来政治行为。</p><p>平台只处理与公共职务和研究问题直接相关、具有明确公开来源且必要的信息。对政党、选举结果和议会构成的汇总分析属于集体层面的研究，不同于针对个人的画像，也不会被转化为对具体个人政治观点的判断。平台不提供选举预测、选民建模或针对个人的政治定向功能。</p></div>,
  ],
  [
    "商标与名称",
    <p key="marks">政党、企业、机构、媒体和产品名称仅用于识别研究对象。所有商标和标识归其权利人所有；名称出现不表示合作、许可或背书。平台不使用第三方标志营造官方或合作关系印象。</p>,
  ],
  [
    "疆界与政治立场",
    <p key="territory">地图上的名称、边界和材料呈现不表达平台对任何国家、领土、地区、当局、法律地位或边界划分的立场。边界文件可能与最新法律文件或各方主张存在差异，应结合原始来源和官方文本理解。</p>,
  ],
] as const;

export default function LegalPage() {
  return (
    <main className="page-shell">
      <p className="eyebrow">Legal, Copyright & Corrections</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">法律、版权与更正说明</h1>
      <p className="mt-4 max-w-4xl text-sm leading-7 text-[var(--muted)]">更新日期：{LEGAL_NOTICES_UPDATED}。本页说明平台的公开研究边界和处理规则，不替代针对具体司法辖区的专业法律意见。</p>

      <div className="mt-7 grid gap-4">
        {sections.map(([title, body]) => (
          <section key={title} className="card p-6">
            <h2 className="text-xl font-semibold">{title}</h2>
            <div className="mt-3 text-sm leading-7 text-[var(--muted)]">{body}</div>
          </section>
        ))}
      </div>

      <section className="mt-6 card p-6">
        <p className="eyebrow">Correction & Takedown</p>
        <h2 className="mt-3 text-2xl font-semibold">更正、权利与撤下请求</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-[var(--muted)]">如发现事实错误、过期信息、版权或商标问题、个人数据问题，或认为某项材料应被更正或撤下，请提供相关页面、争议内容、理由和可核验依据。平台会保留请求及处理结果所需的最少记录。</p>
        <a className="mt-4 inline-flex font-semibold text-[var(--accent)] hover:underline" href={`mailto:${PLATFORM_CONTACT_EMAIL}?subject=Central%20Europe%20Political%20Atlas%20correction%20or%20rights%20request`}>{PLATFORM_CONTACT_EMAIL}</a>
        <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-[var(--accent)]"><Link href="/privacy" className="hover:underline">隐私说明</Link><Link href="/methodology" className="hover:underline">方法论与来源规则</Link></div>
      </section>
    </main>
  );
}
