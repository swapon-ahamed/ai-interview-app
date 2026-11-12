import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// /dashboard*, /interview/*, /room/*, /report/*, /signin, and /api are all
// either behind auth, single-use candidate links, or plumbing — none of it
// has search-engine value, and crawling /interview or /room could even hit
// live LiveKit token endpoints. Only the marketing home page and the public
// practice catalog are worth indexing.
export default function robots(): MetadataRoute.Robots {
  // Development and non-production deployments must never be indexed —
  // only the production domain (NEXT_PUBLIC_APP_ENV=production) is.
  if (process.env.NEXT_PUBLIC_APP_ENV !== "production") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/practice"],
      disallow: [
        "/dashboard",
        "/signin",
        "/signup",
        "/forgot-password",
        "/auth",
        "/interview",
        "/room",
        "/report",
        "/api",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
