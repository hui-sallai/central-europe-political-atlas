import LocaleDocument, { metadata } from "@/components/LocaleDocument";
export { metadata };
export default function ChineseLayout({ children }: { children: React.ReactNode }) {
  return <LocaleDocument locale="zh-CN">{children}</LocaleDocument>;
}
