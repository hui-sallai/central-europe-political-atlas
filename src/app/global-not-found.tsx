import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = { title: "Page not found | Central Europe Political Atlas", robots: { index: false, follow: false } };

// A static host serves one shared 404; each language has explicitly marked text.
export default function GlobalNotFound() {
  return <html lang="zh-CN"><body><main className="page-shell py-16"><h1 className="text-4xl font-semibold">页面不存在</h1><p className="mt-4">请返回<Link href="/" className="text-[var(--accent)] underline">中文首页</Link>。</p><section lang="en" className="mt-8"><h2 className="text-3xl font-semibold">Page not found</h2><p className="mt-4">Return to the <Link href="/en/" className="text-[var(--accent)] underline">English homepage</Link>.</p></section></main></body></html>;
}
