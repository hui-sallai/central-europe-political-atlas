import type { MetadataRoute } from "next";
import { PLATFORM_BASE_URL } from "@/lib/releaseMetadata";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: new URL("sitemap.xml", PLATFORM_BASE_URL).toString(),
    host: PLATFORM_BASE_URL,
  };
}
