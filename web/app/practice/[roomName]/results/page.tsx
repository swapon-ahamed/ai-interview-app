import type { Metadata } from "next";
import ResultsClient from "./ResultsClient";

// Private, per-session results page — no SEO value, and it briefly shows a
// candidate's name and score, so it shouldn't be indexed or followed.
export const metadata: Metadata = {
  title: "Your Practice Results",
  robots: { index: false, follow: false },
};

export default function PracticeResultsPage() {
  return <ResultsClient />;
}
