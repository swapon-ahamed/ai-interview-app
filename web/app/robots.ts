import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// /dashboard*, /interview/*, /room/*, /report/*, /signin, and /api are all
// either behind auth, single-use candidate links, or plumbing — none of it
// has search-engine value, and crawling /interview or /room could even hit
// live LiveKit token endpoints. Only the marketing home page and the public
// practice catalog are worth indexing.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/practice"],
      disallow: ["/dashboard", "/signin", "/interview", "/room", "/report", "/api"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
