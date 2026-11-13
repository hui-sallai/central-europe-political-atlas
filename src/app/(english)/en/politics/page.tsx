import { PoliticalLanding } from "@/components/PoliticalLanding";
import { politicalComparisonCountries, politicalElectionViews } from "@/lib/politicalData";
import { pageMetadata } from "@/lib/seo";
export const metadata = pageMetadata({ title: "Politics and Elections", description: "Parliamentary election records, seats, turnout and electoral rules for Germany, Czechia, Poland, Slovakia and Hungary.", path: "/en/politics/", locale: "en" });
export default function Page() { return <main className="page-shell"><p className="editorial-kicker">Parliamentary elections</p><h1 className="mt-4 mb-6 text-4xl font-semibold">Politics and Elections</h1><PoliticalLanding countries={[{slug:"germany",name:{en:"Germany","zh-CN":"德国"},elections:politicalElectionViews()},...politicalComparisonCountries()]}/></main>; }
