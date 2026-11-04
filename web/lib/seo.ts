// Shared SEO constants — used by layout.tsx, sitemap.ts, and robots.ts so the
// site name/URL/description live in exactly one place.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
export const SITE_NAME = "AI Interview";
export const SITE_DESCRIPTION =
  "Run live, AI-conducted voice and video interviews for your candidates, with automatic transcripts and scorecards — or warm up first with a free, no-signup AI practice interview.";
