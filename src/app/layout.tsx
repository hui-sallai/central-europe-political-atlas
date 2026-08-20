import type { Metadata } from "next";
import Link from "next/link";
import { PLATFORM_BASE_URL, PLATFORM_NAME, PLATFORM_VERSION } from "@/lib/releaseMetadata";
import { primaryNavItems } from "@/lib/siteStructure";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(PLATFORM_BASE_URL),
  title: {
    default: `${PLATFORM_NAME} | 中欧政治经济研究平台`,
    template: `%s | ${PLATFORM_NAME}`,
  },
  description: "面向十个中欧国家的政治经济数据、区域事实比较、透明模型与条件式情景分析平台。",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: PLATFORM_NAME,
    title: `${PLATFORM_NAME} | 中欧政治经济研究平台`,
    description: "Political economy data, spatial comparison and transparent scenario analysis across ten Central European countries.",
    url: PLATFORM_BASE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <a href="#main-content" className="skip-link">跳到主要内容</a>
        <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[rgba(245,243,238,0.94)] backdrop-blur">
          <nav className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6" aria-label="主导航">
            <Link href="/" className="editorial-headline text-base font-bold tracking-[-0.01em] text-[var(--foreground)]">
              Central Europe <span className="text-[var(--accent)]">Political Atlas</span>
            </Link>
            <div className="flex max-w-full gap-x-4 overflow-x-auto py-1 text-xs font-semibold text-[var(--muted)] sm:text-sm">
              {primaryNavItems.map((item) => (
                <Link key={item.href} href={item.href} className="whitespace-nowrap hover:text-[var(--accent)]">
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </header>
        <div id="main-content" tabIndex={-1}>{children}</div>
        <footer className="border-t border-[var(--line)] bg-[var(--surface)]">
          <div className="mx-auto grid max-w-[1240px] gap-3 px-6 py-7 text-xs leading-5 text-[var(--muted)] md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <p>{PLATFORM_NAME} · {PLATFORM_VERSION}</p>
              <p>独立非商业研究项目，与欧盟、各国政府、政党、企业及数据提供方无隶属或背书关系。</p>
            </div>
            <nav className="flex flex-wrap gap-x-4 gap-y-2 md:justify-end" aria-label="法律与隐私">
              <Link href="/legal" className="hover:text-[var(--foreground)]">法律与版权</Link>
              <Link href="/privacy" className="hover:text-[var(--foreground)]">隐私说明</Link>
              <Link href="/methodology" className="hover:text-[var(--foreground)]">方法论</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
