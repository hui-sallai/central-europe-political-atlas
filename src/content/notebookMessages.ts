const en = {
  capacityWarning: "Approaching the notebook limit. Export a backup and remove unneeded evidence or shorten notes before adding more.",
  confirmMemoryLeave: "These notes are only in memory. Switching language reloads the page and loses unsaved edits. Cancel and export your notebook first. Continue anyway?",
  title: "Research Notebook", entry: "Notebook", add: "Add to notebook", added: "Added", addView: "Add current view to notebook", addWorkspace: "Add workspace setup to notebook",
  privacy: "Research notes are stored only in this browser unless you export them.", boundary: "A local evidence organizer, not an estimator or a conclusion generator. Live links do not freeze future official revisions; use Research Snapshot for frozen row-level exports.",
  question: "Research question", evidence: "Evidence", sources: "Sources", methods: "Method notes", notes: "Personal notes", export: "Export", exportButton: "Export research notebook", import: "Import notebook JSON", clear: "Clear research notebook", confirmClear: "Clear all evidence and personal notes in this browser? This cannot be undone unless you exported a copy.", confirmReplace: "Replace the current notebook? Export a copy first if you want to keep it.",
  notebookTitle: "Notebook title", itemNote: "User note", atlas: "Atlas metadata / evidence", open: "Open original view · live link", empty: "No evidence collected yet. Add evidence from Data, Events, Map, Methods or Workspaces.", all: "All", type: "Evidence type", country: "Country", remove: "Remove item", up: "Move up", down: "Move down", collected: "Collected at", comparable: "Comparability", missing: "Missing / unavailable", inactive: "Not currently runnable", native: "Original evidence/source label; untranslated",
  ready: "Saved locally", memory: "Browser storage unavailable or full. Changes remain in memory only; export before leaving.", corrupt: "Stored notebook is invalid or uses an unsupported schema. It has not been overwritten. Export the stored text for recovery, or explicitly clear/import to replace it.", loading: "Reading local notebook…", error: "Action rejected: invalid content or size limit. Existing evidence and notes are retained.", recovery: "Download stored text for recovery", done: "Download initiated", limits: "Up to 100 items; 2,000 characters per item note; 25,000 total note characters; 750 KB serialized notebook. No complete series, SVG or image files are stored.",
  observation: "Observation", series_view: "Series view", country_comparison: "Country comparison", event: "Event", regional_view: "Regional view", map_view: "Map view", method: "Method", source: "Source", workspace: "Workspace",
  dataGroup: "Data", eventGroup: "Events", regionGroup: "Regional evidence", methodGroup: "Methods", workspaceGroup: "Workspaces", sourceGroup: "Sources",
};
const zh: Record<keyof typeof en, string> = {
  capacityWarning: "研究笔记已接近容量限制。继续添加前，请导出备份并移除不需要的证据或缩短备注。",
  confirmMemoryLeave: "这些笔记仅在内存中。切换语言会重新加载页面，未保存的变更将丢失。请取消并先导出笔记。仍要继续吗？",
  title: "研究笔记", entry: "研究笔记", add: "加入研究笔记", added: "已加入", addView: "将当前视图加入研究笔记", addWorkspace: "将工作区设置加入研究笔记",
  privacy: "研究笔记仅保存在当前浏览器中，除非你主动导出。", boundary: "本功能只整理证据，不进行估计或生成结论。实时链接不能冻结今后的官方修订；逐行数据归档请使用研究快照。",
  question: "研究问题", evidence: "证据", sources: "来源", methods: "方法备注", notes: "个人笔记", export: "导出", exportButton: "导出研究笔记", import: "导入研究笔记 JSON", clear: "清空研究笔记", confirmClear: "清空当前浏览器的全部证据和个人笔记？除非已导出备份，否则无法撤销。", confirmReplace: "替换当前研究笔记？如需保留，请先导出备份。",
  notebookTitle: "笔记标题", itemNote: "用户备注", atlas: "Atlas 元数据／证据", open: "打开原始视图 · 实时链接", empty: "尚未收集证据。可从数据、事件、地图、方法或工作区添加。", all: "全部", type: "证据类型", country: "国家", remove: "移除条目", up: "上移", down: "下移", collected: "收集时间", comparable: "可比性", missing: "缺失／不可用", inactive: "当前不可运行", native: "证据或来源原始标签；未翻译",
  ready: "已保存到本地", memory: "浏览器存储不可用或已满。变更仅保存在内存中；离开前请导出。", corrupt: "已存笔记损坏或使用不支持的版本，未被覆盖。可下载原始文本恢复，或明确清空／导入以替换。", loading: "正在读取本地笔记…", error: "操作被拒绝：内容不合法或超出容量限制。已有证据和备注仍保留。", recovery: "下载原始存储文本以恢复", done: "已发起下载", limits: "最多 100 条；每条备注 2,000 字符；备注总计 25,000 字符；序列化笔记上限 750 KB。不保存完整序列、SVG 或图片文件。",
  observation: "单条观测", series_view: "序列视图", country_comparison: "国家对比", event: "事件", regional_view: "区域视图", map_view: "地图视图", method: "方法", source: "来源", workspace: "工作区",
  dataGroup: "数据", eventGroup: "事件", regionGroup: "区域证据", methodGroup: "方法", workspaceGroup: "工作区", sourceGroup: "来源",
};
export const notebookMessages = { "zh-CN": zh, en };
