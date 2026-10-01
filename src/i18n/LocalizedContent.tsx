"use client";
import { Children, cloneElement, isValidElement, Suspense, type ReactNode, type ReactElement } from "react";
import { useLocale } from "./LocaleProvider";
import { localizedRoute } from "./config";
import { englishText } from "./reviewedText";
import Link from "next/link";

// Shared legacy JSX adapter: translates only rendered text and host accessibility
// attributes. It never reads or mutates data props of research components.
function translate(children: ReactNode, labels: Record<string, string>): ReactNode {
  return Children.map(children, child => {
    if (typeof child === "string") return labels[child.trim()] ? child.replace(child.trim(), labels[child.trim()]) : englishText(child);
    if (!isValidElement(child)) return child;
    const element = child as ReactElement<Record<string, unknown>>;
    if (element.props["data-original-language"]) return element;
    const props: Record<string, unknown> = {};
    if (element.type === Suspense && element.props.fallback !== undefined) props.fallback = translate(element.props.fallback as ReactNode, labels);
    if (typeof element.type === "string") {
      for (const key of ["aria-label", "title", "placeholder", "alt"]) if (typeof element.props[key] === "string") props[key] = englishText(element.props[key] as string);
      if (element.type === "optgroup" && typeof element.props.label === "string") props.label = englishText(element.props.label);
    }
    if ((element.type === "a" || element.type === Link) && typeof element.props.href === "string" && !element.props.download) props.href = localizedRoute(element.props.href, "en");
    if (element.props.children !== undefined) props.children = translate(element.props.children as ReactNode, labels);
    return cloneElement(element, props);
  });
}
export function LocalizedContent({ children, labels = {} }: { children: ReactNode; labels?: Record<string, string> }) {
  return useLocale() === "en" ? translate(children, labels) : children;
}
