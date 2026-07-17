"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Interview = {
  room_name: string;
  candidate_name: string;
  job_role: string;
  status: string;
  score: { overall_score?: number } | null;
  created_at: string;
};

export default function DashboardPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);

  useEffect(() => {
    fetch("/api/interviews")
      .then((res) => res.json())
      .then((data) => setInterviews(data.interviews ?? []));
  }, []);

  return (
    <main style={{ maxWidth: 720, margin: "60px auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Interviews</h1>
        <Link href="/">+ New interview</Link>
      </div>

      <table style={{ width: "100%", marginTop: 20, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th style={{ padding: 8 }}>Candidate</th>
            <th style={{ padding: 8 }}>Role</th>
            <th style={{ padding: 8 }}>Status</th>
            <th style={{ padding: 8 }}>Score</th>
            <th style={{ padding: 8 }}></th>
          </tr>
        </thead>
        <tbody>
          {interviews.map((i) => (
            <tr key={i.room_name} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: 8 }}>{i.candidate_name}</td>
              <td style={{ padding: 8 }}>{i.job_role}</td>
              <td style={{ padding: 8 }}>{i.status}</td>
              <td style={{ padding: 8 }}>
                {i.score?.overall_score ? `${i.score.overall_score}/5` : "—"}
              </td>
              <td style={{ padding: 8 }}>
                <Link href={`/report/${i.room_name}`}>View report</Link>
              </td>
            </tr>
          ))}
          {interviews.length === 0 && (
            <tr>
              <td colSpan={5} style={{ padding: 16, color: "#888" }}>
                No interviews yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </main>
  );
}
