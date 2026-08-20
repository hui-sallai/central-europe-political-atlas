import type { Metadata } from "next";
import Link from "next/link";
import { PLATFORM_CONTACT_EMAIL, PLATFORM_LEGAL_NOTICE_UPDATED } from "@/lib/releaseMetadata";

export const metadata: Metadata = {
  title: "隐私说明",
  description: "平台的数据最小化、托管日志、联系邮件和外部链接隐私说明。",
  alternates: { canonical: "/privacy/" },
};

export default function PrivacyPage() {
  return (
    <main className="page-shell">
      <p className="eyebrow">Privacy Notice</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-[-0.03em]">隐私说明</h1>
      <p className="mt-4 max-w-4xl text-sm leading-7 text-[var(--muted)]">更新日期：{PLATFORM_LEGAL_NOTICE_UPDATED}。平台采用数据最小化原则，当前不提供账户、评论、上传、订阅或个性化政治定向功能。</p>

      <div className="mt-7 grid gap-4 md:grid-cols-2">
        <section className="card p-6"><h2 className="text-xl font-semibold">平台主动收集的内容</h2><p className="mt-3 text-sm leading-7 text-[var(--muted)]">当前网站不部署自有分析工具、广告追踪器、营销像素或非必要 Cookie，也不通过网页表单收集姓名、位置、政治观点或其他个人资料。</p></section>
        <section className="card p-6"><h2 className="text-xl font-semibold">托管服务</h2><p className="mt-3 text-sm leading-7 text-[var(--muted)]">网站由 GitHub Pages 托管。GitHub 可能为安全、运行和服务提供处理 IP 地址、请求时间、设备及访问日志；相关处理由 GitHub 的隐私声明约束，平台无法读取或控制其全部基础设施日志。</p><a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noreferrer" className="mt-3 inline-flex text-sm font-semibold text-[var(--accent)] hover:underline">GitHub 隐私声明</a></section>
        <section className="card p-6"><h2 className="text-xl font-semibold">联系邮件</h2><p className="mt-3 text-sm leading-7 text-[var(--muted)]">向公开邮箱发送邮件时，发件地址、正文和附件会被用于回复、核验更正或处理权利请求。只保留完成请求、维护审校记录或履行必要法律义务所需的信息，不出售或用于政治营销。</p></section>
        <section className="card p-6"><h2 className="text-xl font-semibold">外部链接</h2><p className="mt-3 text-sm leading-7 text-[var(--muted)]">点击统计机构、新闻机构、政府、企业或其他第三方链接后，将适用对方的隐私和 Cookie 规则。平台不控制外部网站，也不会把外部链接理解为背书。</p></section>
      </div>

      <section className="mt-6 card p-6">
        <h2 className="text-2xl font-semibold">隐私请求与安全报告</h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-[var(--muted)]">如需查询、更正或删除你通过邮件提交的个人信息，或报告可能泄露数据的安全问题，请联系公开邮箱。请勿在邮件中发送密码、API 密钥、访问令牌、证件号码或不必要的敏感材料。</p>
        <a className="mt-4 inline-flex font-semibold text-[var(--accent)] hover:underline" href={`mailto:${PLATFORM_CONTACT_EMAIL}?subject=Central%20Europe%20Political%20Atlas%20privacy%20or%20security%20request`}>{PLATFORM_CONTACT_EMAIL}</a>
        <div className="mt-5 flex flex-wrap gap-4 text-sm font-semibold text-[var(--accent)]"><Link href="/legal" className="hover:underline">法律与版权说明</Link><Link href="/methodology" className="hover:underline">数据与模型方法论</Link></div>
      </section>
    </main>
  );
}
