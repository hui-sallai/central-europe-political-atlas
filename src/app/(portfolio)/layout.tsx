import LocaleDocument, { metadata } from "@/components/LocaleDocument";
export { metadata };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <LocaleDocument locale="en">{children}</LocaleDocument>;
}
