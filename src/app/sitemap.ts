import type { MetadataRoute } from "next";
import { PLATFORM_BASE_URL, PLATFORM_RELEASE_DATE } from "@/lib/releaseMetadata";

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
  "news/",
  "models/",
  "scenarios/",
  "methodology/",
  "legal/",
  "privacy/",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: new URL(route, PLATFORM_BASE_URL).toString(),
    lastModified: PLATFORM_RELEASE_DATE,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "data/" || route === "methodology/" ? 0.9 : 0.7,
  }));
}
