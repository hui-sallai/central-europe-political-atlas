import Link from "next/link";
import { localizedRoute, type Locale } from "@/i18n/config";
import { eventCaseStudies } from "@/lib/eventCaseStudies";
import { RESEARCH_CASE } from "@/lib/comparativeResearchCase";
import { politicalComparisonCountries, politicalElectionViews } from "@/lib/politicalData";
import { researchCountries, researchEvents, researchObservations } from "@/lib/researchData";
import { spatialDisplayGateAudit } from "@/lib/spatialDataV087";
import publication from "@/data/macro/var_dynamic_response_publication_boundary.json";
import { PLATFORM_VERSION } from "@/lib/releaseMetadata";

// Server-rendered navigation over existing research contracts. No new calculation or coverage registry.
export function FeaturedResearchSection({ locale }: { locale: Locale }) {
  const en = locale === "en", textKey = en ? "en" : "zh";
  return <section className="editorial-section mt-10" aria-labelledby="featured-research-title" data-home-research>
    <h2 id="featured-research-title" className="text-3xl font-semibold">{en ? "Featured research cases" : "专题研究案例"}</h2>
    <p className="mt-3 max-w-4xl leading-7 text-[var(--muted)]">{en ? "Follow a question through recorded evidence, methods and downloadable CSV / JSON. These existing analyses preserve missing evidence and do not establish causal effects." : "沿着研究问题查看已收录证据、方法及可下载的 CSV / JSON。这些已有分析保留证据缺口，不据此识别因果效应。"}</p>
    <div className="mt-5 grid gap-4 lg:grid-cols-3">
      <article className="card p-5" data-home-case="d4">
        <p className="text-xs text-[var(--muted)]">{en ? "Comparative election research" : "跨国选举研究"}</p>
        <h3 className="mt-2 text-xl font-semibold"><Link className="text-[var(--accent)]" href={localizedRoute("/politics/poland/?research_study=d4", locale)}>{en ? "Turnout and pre-election economic conditions" : "投票率与选举前经济状况"}</Link></h3>
        <p className="mt-3 text-sm leading-7">{en ? "Compare successive elections within countries, inspect verified list identities, and check sensitivity to the reference year." : "比较同国内相邻选举，检查已核实名单身份，并查看参照年度变化下的敏感性。"}</p>
        <p className="mt-3 text-xs leading-6 text-[var(--muted)]">{RESEARCH_CASE.countries.map(slug => { const country = researchCountries.find(c => c.slug === slug); return en ? country?.name : country?.name_zh; }).join(en ? ", " : "、")} · {en ? "Slovakia is context only; no election forecasts." : "斯洛伐克仅作背景；不生成选举预测。"}</p>
      </article>
      {eventCaseStudies.map(study => {
        const event = researchEvents.find(candidate => candidate.id === study.event_id && candidate.data_status === "verified");
        if (!event) return null;
        const href = `/models/?tab=run&skill=event_window_analysis&country=${event.country_slug}&event=${event.id}&section=case`;
        return <article key={study.event_id} className="card p-5" data-home-case={study.event_id}>
          <p className="text-xs text-[var(--muted)]">{en ? "Documented implementation history" : "有来源的实施历程"}</p>
          <h3 className="mt-2 text-xl font-semibold"><Link className="text-[var(--accent)]" href={localizedRoute(href, locale)}>{study.title[textKey]}</Link></h3>
          <p className="mt-3 text-sm leading-7">{study.research_question[textKey]}</p>
          <p className="mt-3 text-xs leading-6 text-[var(--muted)]">{study.window ? (en ? "An eligible monthly window provides descriptive context, not an effect estimate." : "合格月度窗口提供描述性背景，不是效应估计。") : study.window_blocker?.[textKey]}</p>
        </article>;
      })}
    </div>
  </section>;
}

export function HomeCoverageSection({ locale }: { locale: Locale }) {
  const en = locale === "en";
  const national = researchCountries.filter(country => researchObservations.some(o => o.country_slug === country.slug && o.value !== null));
  const regional = spatialDisplayGateAudit.filter(country => country.boundary_layer_ready && country.regional_data_ready);
  const political = [{ slug: "germany", elections: politicalElectionViews() }, ...politicalComparisonCountries()].filter(country => country.elections.length > 0);
  const name = (slug: string) => { const country = researchCountries.find(c => c.slug === slug); return (en ? country?.name : country?.name_zh) ?? slug; };
  const groups = [
    { id: "national", title: en ? "National macroeconomic profiles" : "国家宏观经济档案", slugs: national.map(c => c.slug), href: (slug: string) => `/countries/${slug}/`, note: en ? "Published observations exist; indicators and reference periods differ by country." : "已有公布观测；各国的指标与参照时期不同。" },
    { id: "regional", title: en ? "Connected regional maps" : "已连接的区域地图", slugs: regional.map(c => c.country_id), href: (slug: string) => `/map/?country=${slug}`, note: en ? "Boundary and factual-data gates apply by layer. Serbia's regional mapping is pending; its national profile remains available." : "边界与事实数据按图层分别准入。塞尔维亚区域地图待接入，国家档案仍可使用。" },
    { id: "political", title: en ? "Parliamentary election research" : "全国议会选举研究", slugs: political.map(c => c.slug), href: (slug: string) => `/politics/${slug}/`, note: en ? "Selected elections only; election coverage does not establish continuous party identity or cross-country comparability." : "只覆盖已准入选举；不意味着连续政党身份或跨国可比性均已成立。" },
  ];
  return <section className="editorial-section mt-10" aria-labelledby="home-coverage-title" data-home-coverage>
    <h2 id="home-coverage-title" className="text-3xl font-semibold">{en ? "Country and regional exploration" : "国家与区域探索"}</h2>
    <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{en ? "Browse the published national, regional and election coverage. Historical data availability and eligibility for statistical models are assessed separately." : "查阅已发布的国家、区域和选举资料。历史数据覆盖与统计模型的适用条件分别说明。"}</p>
    <div className="mt-5 grid gap-4 lg:grid-cols-3">{groups.map(group => <article key={group.id} className="card p-5" data-home-coverage-kind={group.id}>
      <h3 className="text-lg font-semibold"><span className="metric-number">{group.slugs.length}</span> · {group.title}</h3>
      <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{group.note}</p>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">{group.slugs.map(slug => <li key={slug}><Link className="text-[var(--accent)] underline" href={localizedRoute(group.href(slug), locale)}>{name(slug)}</Link></li>)}</ul>
    </article>)}</div>
  </section>;
}

export function HomeMethodologySection({ locale }: { locale: Locale }) {
  const en = locale === "en";
  return <section className="card mt-10 p-6" aria-labelledby="home-methods-title" data-home-methods>
    <h2 id="home-methods-title" className="text-2xl font-semibold">{en ? "Methods, availability and limits" : "方法、可用性与限制"}</h2>
    <p className="mt-3 leading-7 text-[var(--muted)]">{en ? "Workspaces discover and configure existing evidence. Models execute only authorised calculations under their own sample and inference rules. Research cases provide implemented analyses with sources and reproducible exports. Neither a historical observation nor a workspace selection admits data into a formal model." : "工作区用于发现和配置已有证据；模型只在自身样本与推断规则下执行已授权计算；研究案例提供已有分析、来源与可复现导出。历史观测或工作区选择本身都不构成正式模型准入。"}</p>
    <p className="mt-3 text-sm leading-7" data-home-var-gate>{en ? "Formal VAR dynamic responses and IRFs remain unavailable: the finite-sample residual publication gate is unresolved." : "正式 VAR 动态响应与 IRF 仍不可用：有限样本残差发布门禁尚未解决。"} {publication.coefficient_estimation_available ? (en ? `Existing coefficient estimation covers ${publication.units.filter(unit => unit.estimable).length} country/profile units, not every country or specification.` : `已有系数估计覆盖 ${publication.units.filter(unit => unit.estimable).length} 个国家／规格单元，并非所有国家或规格。`) : null}</p>
    <p className="mt-3 text-sm leading-7 text-[var(--muted)]">{en ? "Descriptive associations do not identify causes. Conditional scenarios are assumption-based illustrations. LP and Panel LP retain their existing sample and inference limitations." : "描述性关联不识别因果；条件情景是基于假设的演示。LP 与 Panel LP 保留各自现有样本和推断限制。"}</p>
    <nav className="mt-4 flex flex-wrap items-center gap-4 text-sm" aria-label={en ? "Methodology and research tools" : "方法与研究工具"}>
      <Link className="rounded-full cta-dark px-5 py-2.5 font-semibold" href={localizedRoute("/methodology/", locale)}>{en ? "Methods, sources and research downloads" : "方法、来源与研究下载"}</Link>
      <Link className="text-[var(--accent)] underline" href={localizedRoute("/models/", locale)}>{en ? "Authorised models and eligibility" : "已授权模型与资格"}</Link>
      <Link className="text-[var(--accent)] underline" href={localizedRoute("/scenarios/", locale)}>{en ? "Conditional scenarios" : "条件情景"}</Link>
      <a className="text-[var(--accent)] underline" href="/research-data/var-publication-boundary/var_dynamic_response_publication_boundary.json">{en ? "VAR publication boundary record" : "VAR 发布边界记录"}</a>
    </nav>
    <details className="mt-4 text-xs text-[var(--muted)]"><summary className="cursor-pointer">{en ? "Version and deployment information" : "版本与部署信息"}</summary><p className="mt-2 break-words">{PLATFORM_VERSION}</p><a className="mt-2 inline-block text-[var(--accent)] underline" href="/research-data/deployment_provenance.json">{en ? "Deployment provenance" : "部署来源记录"}</a></details>
  </section>;
}
