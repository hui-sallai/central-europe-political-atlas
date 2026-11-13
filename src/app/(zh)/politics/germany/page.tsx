import PoliticalExplorerAlpha from '@/components/PoliticalExplorerAlpha';
import {politicalComparisonCountries,politicalElectionViews} from '@/lib/politicalData';
import {politicalContextData} from '@/lib/politicalContextData';
import {pageMetadata} from '@/lib/seo';
export const metadata=pageMetadata({description:'Official parliamentary election results, turnout, seats and research context.',title:'德国议会选举',path:'/politics/germany/',});
export default function Page(){return <main className="page-shell"><h1 className="mt-4 text-4xl font-semibold">德国议会选举</h1><PoliticalExplorerAlpha elections={politicalElectionViews()} comparisonCountries={politicalComparisonCountries()} contextInputs={politicalContextData('germany')}/></main>;}
