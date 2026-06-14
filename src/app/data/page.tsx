import { DataCountryExplorer } from "@/components/DataCountryExplorer";
import { countries } from "@/lib/data";

export default function DataOverviewPage() {
  const projectCount = countries.reduce((sum, country) => sum + country.chinaProjects.length, 0);

  return (
    <main className="page-shell">
      <p className="eyebrow">Data Workspace</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">数据工作台</h1>
      <p className="mt-4 max-w-3xl leading-8 text-[var(--muted)]">
        数据页改为按国家单独查看。先选择国家，再查看该国宏观经济、官方来源、地图图层、对华经贸样本、新闻记录和资料入口。
      </p>

      <section className="mt-6 rounded-2xl border border-[var(--line)] bg-white/45 p-4 text-sm leading-7 text-[var(--muted)]">
        当前对华经贸项目样本共 {projectCount} 个；本页不再做十国横向堆叠表，而是把每个国家作为一个独立数据档案维护。
      </section>

      <DataCountryExplorer />
    </main>
  );
}
