export const frozenNavItems = [
  { href: "/", label: "首页", role: "国家入口 + 核心指标" },
  { href: "/map", label: "地图", role: "地图工作台入口" },
  { href: "/countries", label: "国家", role: "国家档案 + 图层仪表盘" },
  { href: "/data", label: "数据", role: "数据工作台" },
  { href: "/news", label: "事件库", role: "政治经济事件编码与指标关联入口" },
  { href: "/models", label: "模型", role: "透明模型、输入追踪与 Model Card" },
  { href: "/scenarios", label: "情景", role: "基线、冲击假设与情景差值" },
  { href: "/methodology", label: "方法论", role: "数据边界和口径说明" },
];

export const frozenScopeNotes = [
  "v0.60 在 /scenarios 提供条件式情景比较；/forecast 仍不存在。",
  "透明压力分数不等于预测、风险真值或政策评价。",
  "模型和情景先在 Models、Scenarios 与 Country 页面验证，不进入地图风险图层。",
];
