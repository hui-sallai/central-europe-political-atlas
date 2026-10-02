import type { MetadataRoute } from "next";
import { PLATFORM_BASE_URL, PLATFORM_RELEASE_DATE } from "@/lib/releaseMetadata";
import { localizedRoute } from "@/i18n/config";
import { workspaceIds } from "@/content/researchWorkspaces";

export const dynamic = "force-static";

const routes = [
  "",
  "map/",
  "countries/",
  "countries/poland/",
  "countries/hungary/",
  "countries/czechia/",
  "countries/slovakia/",
  "countries/germany/",
  "countries/austria/",
  "countries/romania/",
  "countries/slovenia/",
  "countries/croatia/",
  "countries/serbia/",
  "data/",
  "politics/",
  "news/",
  "models/",
  "scenarios/",
  "methodology/",
  "historical-extension/",
  "legal/",
  "privacy/",
  "workspaces/",
  "notebook/",
  ...workspaceIds.map(id => `workspaces/${id}/`),
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.flatMap((route) => route === "historical-extension/" ? [route] : [route, `en/${route}`]).map((route) => ({
    url: new URL(route, PLATFORM_BASE_URL).toString(),
    lastModified: PLATFORM_RELEASE_DATE,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "data/" || route === "methodology/" ? 0.9 : 0.7,
    ...(route === "historical-extension/" ? {} : { alternates: { languages: {
      "zh-CN": new URL(localizedRoute(`/${route}`, "zh-CN").slice(1), PLATFORM_BASE_URL).toString(),
      en: new URL(localizedRoute(`/${route}`, "en").slice(1), PLATFORM_BASE_URL).toString(),
      "x-default": new URL(localizedRoute(`/${route}`, "zh-CN").slice(1), PLATFORM_BASE_URL).toString(),
    } } }),
  }));
}
