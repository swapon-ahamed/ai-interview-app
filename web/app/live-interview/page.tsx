import type { Metadata } from "next";
import LiveInterviewClient from "./LiveInterviewClient";

export const metadata: Metadata = {
  title: "See a Live Interview",
  description:
    "Watch a recorded walkthrough of an AI-conducted interview end to end — the questions, the answers, and the scorecard a recruiter would see minutes later.",
  alternates: { canonical: "/live-interview" },
};

export default function LiveInterviewPage() {
  return <LiveInterviewClient />;
}
