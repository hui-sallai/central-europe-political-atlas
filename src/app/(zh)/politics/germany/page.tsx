import PoliticalExplorerAlpha from '@/components/PoliticalExplorerAlpha';
import { PoliticalCountryHeader } from '@/components/PoliticalCountryHeader';
import {politicalComparisonCountries,politicalElectionViews} from '@/lib/politicalData';
import {politicalContextData} from '@/lib/politicalContextData';
import {pageMetadata} from '@/lib/seo';
export const metadata=pageMetadata({description:'德国联邦议院历届官方选举结果、投票率、席位构成与研究背景。',title:'德国议会选举',path:'/politics/germany/',});
export default function Page(){return <main className="page-shell"><PoliticalCountryHeader country="germany" locale="zh-CN" title="德国议会选举"/><PoliticalExplorerAlpha elections={politicalElectionViews()} comparisonCountries={politicalComparisonCountries()} contextInputs={politicalContextData('germany')}/></main>;}
