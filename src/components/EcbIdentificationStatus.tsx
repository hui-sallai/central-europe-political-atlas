import acquisition from "@/data/identified-shocks/ecb_monetary_event_data_acquisition_manifest.json";
import factors from "@/data/identified-shocks/ecb_policy_factor_registry.json";
import informationEffects from "@/data/identified-shocks/monetary_policy_information_effect_registry.json";
import overlap from "@/data/identified-shocks/ecb_event_dataset_overlap_registry.json";
import validation from "@/data/identified-shocks/ecb_shock_validation_summary.json";
import separation from "@/data/identified-shocks/information_effect_separation_validation.json";
import sample from "@/data/identified-shocks/jk_event_sample_registry.json";
import authorReference from "@/data/identified-shocks/jk_author_reference_comparison.json";
import medianValidation from "@/data/identified-shocks/jk_median_rotation_replication_validation.json";

export function EcbIdentificationStatus() {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const directFactors = factors.records.filter((factor) => factor.workbook_presence === "official_field_present");
  const blockedFactors = factors.records.filter((factor) => factor.causal_status === "blocked");

  return (
    <section className="editorial-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="editorial-kicker">Monetary Policy Identification / v1.62</p>
          <h2 className="mt-2 text-2xl font-semibold">货币政策识别</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)]">Jarociński–Karadi 作者参考的 PC1、poor-man、确定性中位旋转与月度序列已逐项复刻通过。基准显示 Monetary Policy 与 Central Bank Information 两个代表性分量；它们不是唯一结构真值。Local Projections 仍未启用。</p>
        </div>
        <span className="rounded-full border border-[var(--success)] px-3 py-1 text-xs font-semibold text-[var(--success)]">作者参考验证通过 · LP 未启用</span>
      </div>

      <dl className="mt-6 grid gap-px overflow-hidden border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["官方数据集", `${acquisition.record_count} 个`],
          ["事件窗口记录", validation.canonical_event_count.toLocaleString("zh-CN")],
          ["跨库重叠记录", overlap.record_count.toLocaleString("zh-CN")],
          ["识别冲击", `${validation.identified_shock_count} 个`],
          ["外部创新代理", `${validation.external_innovation_proxy_count} 个`],
          ["因果 LP 准入", `${validation.causal_lp_ready_count} 个`],
          ["LP estimator", validation.lp_method_state],
          ["验证", `${validation.total_tests} 项通过`],
          ["JK 输入事件", `${sample.eligible_count} 个`],
          ["信息效应验证", separation.status],
          ["结构分量", "2 个代表性冲击"],
          ["作者参考期", "through 2025-11"],
        ].map(([label, value]) => <div key={label} className="bg-[var(--surface)] p-3"><dt className="text-xs text-[var(--muted)]">{label}</dt><dd className="mt-1 text-sm font-semibold">{value}</dd></div>)}
      </dl>

      <details className="advanced-disclosure mt-5">
        <summary>查看数据集、因子与识别闸门</summary>
        <div className="mt-4 grid gap-5 text-sm leading-7 text-[var(--muted)] lg:grid-cols-3">
          <div><h3 className="font-semibold text-[var(--foreground)]">数据与窗口</h3><p className="mt-2">EA-MPD 作为正式政策决策基线；EA-EMPD 用于讲话事件和扩展稳健性。决策、记者会、组合窗口与讲话窗口保持分开；同一次会议不会因同时出现在两个数据集而重复计数。</p></div>
          <div><h3 className="font-semibold text-[var(--foreground)]">因子边界</h3><p className="mt-2">工作簿直接提供 {directFactors.length} 条当前规范代理。Target、Timing、Forward Guidance、QE 共 {blockedFactors.length} 项只在方法论中定义，当前附件没有可直接复用的正式因子列，因此没有从原始列静默重建。</p></div>
          <div><h3 className="font-semibold text-[var(--foreground)]">识别边界</h3><p className="mt-2">信息效应状态为 {informationEffects.records[0]?.information_effect_handling}。作者参考匹配为 {authorReference.status}，中位旋转角为 {medianValidation.rotation_angle_radians.toFixed(6)}。poor-man 仅作限制性稳健性诊断；中位分解允许同一事件同时含两类冲击。</p></div>
        </div>
        <p className="mt-4 text-xs text-[var(--muted)]">v1.62 JK replication: {authorReference.status} · identified shocks: {validation.identified_shock_count} · Local Projections: registry_only</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={`${basePath}/research-data/ecb_monetary_event_data_acquisition_manifest.json`} className="text-sm font-semibold text-[var(--accent)]">Acquisition manifest</a>
          <a href={`${basePath}/research-data/ecb_policy_factor_registry.json`} className="text-sm font-semibold text-[var(--accent)]">Factor registry</a>
          <a href={`${basePath}/research-data/monetary_policy_information_effect_registry.json`} className="text-sm font-semibold text-[var(--accent)]">Information-effect audit</a>
          <a href={`${basePath}/research-data/ecb_shock_validation_summary.json`} className="text-sm font-semibold text-[var(--accent)]">Validation summary</a>
          <a href={`${basePath}/research-data/monetary_policy_identification_method_registry.json`} className="text-sm font-semibold text-[var(--accent)]">JK method registry</a>
          <a href={`${basePath}/research-data/information_effect_separation_validation.json`} className="text-sm font-semibold text-[var(--accent)]">Information-effect validation</a>
          <a href={`${basePath}/research-data/jk_author_reference_comparison.json`} className="text-sm font-semibold text-[var(--accent)]">Author-reference comparison</a>
        </div>
      </details>
    </section>
  );
}
