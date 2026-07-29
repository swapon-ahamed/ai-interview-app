import type { Metadata } from "next";
import { Suspense } from "react";
import PracticeCatalogClient from "./PracticeCatalogClient";

export const metadata: Metadata = {
  title: "Free AI Practice Interviews",
  description:
    "Pick a role and take a free, no-signup AI-powered practice interview — get instant feedback on your answers, communication, and English fluency before the real thing.",
  alternates: { canonical: "/practice" },
};

export default function PracticePage() {
  return (
    <Suspense fallback={null}>
      <PracticeCatalogClient />
    </Suspense>
  );
}
