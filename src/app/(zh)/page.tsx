import Link from 'next/link';
import {pageMetadata} from '@/lib/seo';
import {HomeResearchMap,type HomeMapCountry} from '@/components/HomeResearchMap';
import {researchCountries} from '@/lib/researchData';
import {PLATFORM_VERSION} from '@/lib/releaseMetadata';
export const metadata=pageMetadata({title:'中欧政治经济平台',description:'从交互地图进入国家档案、经济数据、政治、区域地图和研究。',path:'/',});
export default function Home(){const countries:HomeMapCountry[]=researchCountries.map(c=>({slug:c.slug,nameZh:c.name_zh,nameEn:c.name,iso2:c.iso2,indicators:[],latestEvent:null}));return <main className="page-shell"><header className="pb-6"><p className="editorial-kicker">Central Europe Political Atlas · {PLATFORM_VERSION.split(' ')[0]}</p><h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">中欧政治经济平台</h1><nav className="mt-5 flex flex-wrap gap-4 text-sm font-semibold" aria-label="主要研究导航"><Link className="underline text-[var(--accent)]" href="/countries/">国家</Link><Link className="cta-dark rounded px-3 py-2" href="/data/">数据与比较</Link><Link className="underline text-[var(--accent)]" href="/politics/">政治与选举</Link><Link className="underline text-[var(--accent)]" href="/map/">区域地图</Link><Link className="underline text-[var(--accent)]" href="/workspaces/">研究</Link></nav></header><HomeResearchMap countries={countries} locale="zh-CN"/></main>;}
