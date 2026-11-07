# Central Europe Political Atlas — v2.0 Round 1 上线验收报告

验收日期：2026-11-08（Australia/Melbourne）  
范围：双语首页、研究导航、三条研究旅程及 D4 导出来源修复。

## 1. 验收结论

**本轮验收通过，修复已上线。** 未发现本次范围内尚未解决的发布阻塞。

| 发布标识 | 核验结果 |
|---|---|
| 平台版本 | v2.0，保持不变 |
| 线上提交 | `87e2879f9c55c808d0e97217a8571ddbeb751c48` |
| GitHub Pages | #363，构建和部署均成功 |
| 工作流运行 | `42397600046` |
| 线上身份 | 公开部署清单与工作流提交一致 |

证据：[部署记录](https://github.com/hui-sallai/central-europe-political-atlas/actions/runs/42397600046) · [公开部署清单](https://hy-central-europe-analysis.org/research-data/deployment_provenance.json)。

本报告记录上线后的最终结果；[此前候选验收记录](v20-finalization-round1-2026-11-08.md)保留修复发布前的历史状态。

## 2. 功能验收

| 项目 | 结果 | 已确认内容 |
|---|---|---|
| 中英文首页 | 通过 | 研究目的、案例入口、四个问题导向工作区、国家地图及方法入口清晰可达 |
| 覆盖与可用性 | 通过 | 10 国宏观档案、9 国区域地图、5 国已准入议会选举研究；历史观测与模型资格分开说明 |
| 新闻与模型限制 | 通过 | 新闻显示真实批次和核验日期；正式 VAR 动态响应及 IRF 仍不可用 |
| D4 比较研究 | 通过 | 首页进入后自动打开研究案例；协议、12 组选举、结果、敏感性、缺失和可比性说明可见 |
| 匈牙利 CATL | 通过 | 国家与事件恢复正确；E1/E2/E2.1、公司声明与官方证据区分、许可容量及证据缺口保留；月度窗口不可用原因明确 |
| 捷克 REPowerEU | 通过 | 事件和案例恢复正确，描述性月度窗口可用；初步评估、资金阶段和实际付款区分；电网接入容量不表述为发电量 |
| 双语与响应式交互 | 通过 | 桌面 1440、移动端 390；语言往返、刷新、键盘导航、表格横向滚动、图表及下载操作通过 |

三条研究入口：

- [D4 跨国政治经济研究](https://hy-central-europe-analysis.org/en/politics/poland/?research_study=d4)
- [匈牙利 CATL 实施研究](https://hy-central-europe-analysis.org/en/models/?tab=run&skill=event_window_analysis&country=hungary&event=hu-2022-08-12-catl-debrecen&section=case)
- [捷克 REPowerEU 实施研究](https://hy-central-europe-analysis.org/en/models/?tab=run&skill=event_window_analysis&country=czechia&event=cz-2023-10-16-repowereu-plan&section=case)

## 3. 发现与修复

发现一处实际导出追溯缺陷：D4 的 **40 个汇总 CSV 行**将“由其他行推导”的说明文字放在 `source_refs` 中，不能解析为来源 ID。

修复内容：

- 将推导说明保留在 `note`。
- 从已有来源索引填入真实 ID，排序并去重。
- 国家汇总引用该国及对应指标的来源；排除国家的敏感性汇总同时保留备注中全样本比较所需的来源。
- 删除旧测试对说明文字的例外，要求每个非空来源引用均可解析。

**未改变观测值、公式、结果、研究协议、JSON 结构或方法版本。** 未更改经济、政治、贸易、事件数据或模型发布门禁。

## 4. 导出一致性与复现

- 页面显示的投票率变化及可用的主视图／敏感性指标变化，与 JSON 在显示精度下一致。
- CSV 的数值、差值、单位和方法版本与 JSON 一致。
- D4 保留 **110 条来源索引**，修复后的 CSV 来源引用均可解析。
- 上线后实际下载了中英文 CSV/JSON；桌面和移动端 D4 复测均通过。
- D4 JSON 证据摘要在修复前后不变：

`9726ff0011832f6ff6d032448f192c5f186e82147d97d060d0c8b899157f3213`

上述摘要针对 `JSON.stringify(evidence)`，不是整个 JSON 文件或 ZIP 的字节摘要。

部署清单登记的研究包 SHA-256：

`962d660678531b45ff30ae250f194c6787927bf01cde3df02dff31bbe4db0309`

本轮复用[既有 E2.1 文档与导出验收](e21-production-acceptance-2026-11-07.md)，未重新下载和计算原始 PDF 或完整研究 ZIP 的摘要。

## 5. 测试记录

| 验证范围 | 结果 |
|---|---|
| 候选版整合浏览器测试 | 12 项通过 |
| D4 与精确哈希治理工具测试 | 25 项通过 |
| 静态构建与发布检查 | 构建成功；145 项发布检查，零阻塞 |
| 导出及内部链接 | 174 个导出、3,013 条内部链接已检查 |
| 正式部署 CI 浏览器测试 | **626 项通过** |
| 上线后针对性 D4 复测 | **2 项通过**，覆盖两个视口及各自的中英文往返与实际下载 |
| 类型、双语、界面、SEO、治理 | 通过；ESLint 零错误，保留一项既有未使用变量警告 |
| 密钥与本地路径检查 | 推送前及生成网页扫描通过 |

候选版、正式 CI 和上线后复测是不同阶段的证据，未将本地通过等同于线上通过。本轮未开展新的完整安全审计；完整安全验证按约定在阶段收尾集中进行。

## 6. 已发布文件

提交 `87e2879` 包含六个文件：

1. `src/lib/comparativeResearchCase.ts` — 修复汇总 CSV 来源引用。
2. `docs/legal-security/ui_governance_amendments.json` — 登记精确文件哈希与修改边界。
3. `tests/tooling/comparative-research-case.test.mjs` — 加强来源解析与范围检查。
4. `tests/ui/v20-finalization.spec.ts` — 双语研究旅程、恢复及导出一致性验收。
5. `playwright.finalization-acceptance.config.ts` — 复用既有 Playwright 验收配置。
6. `docs/v20-finalization-round1-2026-11-08.md` — 发布前候选版验收记录。

本上线验收报告为部署后整理，不属于上述发布提交。

## 7. 保留的研究限制

- 描述性关联不构成因果识别或选举预测。
- CATL 的实际投资、产出及部分许可／法院证据缺口，仍按已有记录披露。
- 捷克第七次付款请求仍按所持证据标注为初步评估，不据此推断实际付款或经济成效。
- 国别、时期、统计定义和样本资格继续由各工作流分别约束。
- 正式 VAR 动态响应与 IRF 发布门禁保持关闭。

结论适用于上述已测试的 v2.0 集成范围，不扩大为对全部历史数据、原始文献或模型方法的重新审计。
