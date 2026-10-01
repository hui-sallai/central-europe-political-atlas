import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { ModelsPageContent } from "@/components/ModelsPageContent";
export const metadata: Metadata = pageMetadata({ title: "分析工作台", description: "分析综合指标、面板计量、宏观驱动、简化式 VAR、已识别 ECB 冲击、Local Projections、事件窗口与贸易网络；支持同年、同单位、同定义的年度指标及综合指数比较。", path: "/models/" });
export default function ModelsPage() { return <ModelsPageContent />; }
