import { monthNumber } from "./monthlyComparison";

export type EventContextDates = { from: string; to: string };

// Calendar boundaries only. No local-time arithmetic or indicator/category hypothesis.
export function monthlyEventDates(from: string, to: string): EventContextDates | null {
  const distance = monthNumber(to) - monthNumber(from);
  if (!Number.isFinite(distance) || distance < 0 || distance >= 1200) return null;
  const year = Number(to.slice(0, 4)), month = Number(to.slice(5));
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const lastDay = month === 2 ? (leap ? 29 : 28) : [4, 6, 9, 11].includes(month) ? 30 : 31;
  return { from: `${from}-01`, to: `${to}-${lastDay}` };
}

export function monthlyEventLinks(selected: string[], availableCountries: readonly string[], from: string, to: string, en: boolean): { country: string; href: string }[] {
  const dates = monthlyEventDates(from, to);
  if (!dates || selected.length < 2 || selected.length > 5 || new Set(selected).size !== selected.length || selected.some(country => !availableCountries.includes(country))) return [];
  return selected.map(country => ({ country, href: `${en ? "/en" : ""}/news/?${new URLSearchParams({ country, from: dates.from, to: dates.to })}` }));
}
