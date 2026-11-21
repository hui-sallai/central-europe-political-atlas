import type { Locale } from "@/i18n/config";

// Translate the allocation method on the election's own rule record. A newly
// admitted method falls back to its recorded text until it has a reviewed label.
const allocationLabels: Record<string, Record<Locale, string>> = {
  "one scrutiny: successive divisors 1, 2, 3 … within each region": {
    en: "One scrutiny. Each region awards its seats to the largest quotients after dividing qualifying lists’ votes by 1, 2, 3 and so on. There is no national remainder allocation.",
    "zh-CN": "一级分配。各选区将达到门槛的名单票数依次除以 1、2、3 等，按商数由高到低分席；无全国余票分配。",
  },
  "two scrutinies: regional quota (votes ÷ (seats + 2)), then national remainders (÷ (unallocated seats + 1))": {
    en: "Two scrutinies. First, each region divides qualifying votes by its seats plus two to obtain a rounded quota. Remaining seats are allocated nationally using the summed remainders divided by unallocated seats plus one, rounded.",
    "zh-CN": "两级分配。第一级以各选区达到门槛的名单总票数除以该区席位数加二，取整得到配额。第二级汇总余票，除以未分配席位数加一并取整，按全国配额分配剩余席位。",
  },
};

export function czechAllocationLabel(method: string | null, locale: Locale): string | null {
  return method === null ? null : allocationLabels[method]?.[locale] ?? method;
}
