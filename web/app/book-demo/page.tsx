import type { Metadata } from "next";
import BookDemoClient from "./BookDemoClient";

export const metadata: Metadata = {
  title: "Book a Demo",
  description:
    "See how your team would run interviews on AI Interview — a live mock interview and a real scorecard.",
  alternates: { canonical: "/book-demo" },
};

export default function BookDemoPage() {
  return <BookDemoClient />;
}
