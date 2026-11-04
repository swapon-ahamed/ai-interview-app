"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type ScoreCard = {
  overall_score: number;
  communication: number;
  technical_depth: number;
  problem_solving: number;
  culture_fit: number;
  english_proficiency: number;
  language_feedback: string;
  summary: string;
  recommendation: string;
};

type TranscriptItem = { role: string; content: string };

type Interview = {
  candidate_name: string;
  job_role: string;
  status: string;
  transcript: TranscriptItem[] | null;
  score: ScoreCard | null;
};

export default function ReportPage() {
  const { roomName } = useParams<{ roomName: string }>();
  const [interview, setInterview] = useState<Interview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/interviews/${roomName}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setInterview(data.interview);
      });
  }, [roomName]);

  if (error) return <p style={{ padding: 40, color: "red" }}>{error}</p>;
  if (!interview) return <p style={{ padding: 40 }}>Loading…</p>;

  const { score } = interview;

  return (
    <main style={{ maxWidth: 720, margin: "60px auto", fontFamily: "sans-serif" }}>
      <h1>{interview.candidate_name}</h1>
      <p style={{ color: "#666" }}>
        {interview.job_role} · Status: {interview.status}
      </p>

      {score ? (
        <section style={{ marginTop: 24, padding: 16, background: "#f7f7f7", borderRadius: 8 }}>
          <h2>Scorecard</h2>
          <p>
            <strong>Overall: {score.overall_score}/5</strong> — {score.recommendation}
          </p>
          <ul>
            <li>Communication: {score.communication}/5</li>
            <li>Technical depth: {score.technical_depth}/5</li>
            <li>Problem solving: {score.problem_solving}/5</li>
            <li>Culture fit: {score.culture_fit}/5</li>
            <li>English proficiency: {score.english_proficiency}/5</li>
          </ul>
          <p>{score.summary}</p>
          {score.language_feedback && (
            <p style={{ color: "#666", fontSize: 14 }}>
              <strong>Grammar &amp; fluency:</strong> {score.language_feedback}
            </p>
          )}
        </section>
      ) : (
        <p style={{ marginTop: 24, color: "#888" }}>
          {interview.status === "completed"
            ? "No score generated for this interview."
            : "Score will appear here once the interview is completed."}
        </p>
      )}

      <section style={{ marginTop: 32 }}>
        <h2>Transcript</h2>
        {interview.transcript && interview.transcript.length > 0 ? (
          interview.transcript.map((item, i) => (
            <p key={i}>
              <strong>{item.role === "assistant" ? "AI Interviewer" : "Candidate"}:</strong>{" "}
              {item.content}
            </p>
          ))
        ) : (
          <p style={{ color: "#888" }}>No transcript yet.</p>
        )}
      </section>
    </main>
  );
}
