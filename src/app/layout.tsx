import type { Metadata } from "next";
import Link from "next/link";
import { frozenNavItems } from "@/lib/siteStructure";
import "./globals.css";

export const metadata: Metadata = {
  title: "中欧政治经济地图",
  description: "V4 political and economic atlas prototype.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="border-b border-[var(--line)] bg-[rgba(246,244,238,0.86)] backdrop-blur">
          <nav className="mx-auto flex max-w-[1180px] items-center justify-between px-6 py-4">
            <Link href="/" className="text-sm font-bold tracking-[0.16em] text-[var(--accent)] uppercase">
              Central Europe Political Atlas
            </Link>
            <div className="flex gap-5 text-sm text-[var(--muted)]">
              {frozenNavItems.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-[var(--foreground)]">
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
