import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Only the pages worth indexing (see robots.ts) — everything else is either
// auth-gated, a single-use candidate link, or a private per-session results
// page (noindex'd directly on that page instead).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/practice`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/book-demo`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/live-interview`,
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
