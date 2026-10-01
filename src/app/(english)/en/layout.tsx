import type { Metadata } from "next";
import LocaleDocument from "@/components/LocaleDocument";
import { PLATFORM_BASE_URL, PLATFORM_NAME } from "@/lib/releaseMetadata";
export const metadata: Metadata = {
  metadataBase: new URL(PLATFORM_BASE_URL),
  title: { default: PLATFORM_NAME, template: `%s | ${PLATFORM_NAME}` },
  description: "Political economy data, spatial comparison and transparent scenario analysis across ten Central European countries.",
};
export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return <LocaleDocument locale="en">{children}</LocaleDocument>;
}
