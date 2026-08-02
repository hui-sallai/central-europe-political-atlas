import { DataLayerOverview } from "@/components/DataLayerOverview";
import { InteractiveMapExplorer } from "@/components/InteractiveMapExplorer";

const HOME_STAGE = "v0.18 Hungary validation manifest finalization";
const HOME_STATUS = [
  ["当前阶段", HOME_STAGE],
  ["区域地图数据", "匈牙利 NUTS3 validation manifest 明细核验已记录"],
  ["真实地图展示", "未启用"],
  ["模型层", "未启用"],
] as const;

export default function Home() {
  return (
    <main className="page-shell home-shell">
      <section className="home-first-screen">
        <div className="mb-2 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow">V4 Prototype / Research Atlas / {HOME_STAGE}</p>
            <h1 className="mt-1 max-w-4xl text-3xl font-semibold leading-tight tracking-[-0.04em] text-[var(--foreground)]">
              中欧政治经济地图
            </h1>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--muted)]">
              点击地图或右侧国家按钮切换；首页只保留地图、当前国家、核心指标和新闻入口。
            </p>
          </div>
        </div>
        <div className="mb-3 grid gap-2 text-xs md:grid-cols-4">
          {HOME_STATUS.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-[var(--line)] bg-white/70 px-3 py-2">
              <p className="font-semibold text-[var(--muted)]">{label}</p>
              <p className="mt-1 font-semibold text-[var(--foreground)]">{value}</p>
            </div>
          ))}
        </div>

        <InteractiveMapExplorer variant="home" />
      </section>

      <section className="mt-5">
        <DataLayerOverview compact title="首页数据层总览" />
      </section>
    </main>
  );
}
