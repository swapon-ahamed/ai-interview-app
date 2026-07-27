"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Interview = {
  id: string;
  room_name: string;
  candidate_name: string;
  job_role: string;
  status: string;
  scheduled_start: string | null;
  scheduled_end: string | null;
  created_at: string;
  company_name: string | null;
};

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

function ExpiryBadge({ scheduledEnd }: { scheduledEnd: string | null }) {
  if (!scheduledEnd) {
    return (
      <span style={{ fontSize: 12, color: "#888" }}>No expiry set</span>
    );
  }

  const expired = new Date(scheduledEnd) < new Date();
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        background: expired ? "#fdecea" : "#e6f4ea",
        color: expired ? "#a1260d" : "#1e7e34",
      }}
    >
      {expired ? "Expired" : "Active"}
    </span>
  );
}

export default function InterviewsPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/signin");
        return;
      }
      setChecked(true);
      loadInterviews(session.access_token);
    });
  }, [router]);

  async function loadInterviews(accessToken: string) {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/interviews", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Failed to load interviews.");
      setInterviews([]);
      setLoading(false);
      return;
    }

    setInterviews(data.interviews ?? []);
    setLoading(false);
  }

  if (!checked) return null;

  return (
    <main style={{ maxWidth: 1000, margin: "60px auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Interviews</h1>
        <Link href="/dashboard">← Dashboard</Link>
      </div>

      {error && <p style={{ color: "crimson", marginTop: 16 }}>{error}</p>}

      <table style={{ width: "100%", marginTop: 20, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th style={{ padding: 8 }}>Candidate</th>
            <th style={{ padding: 8 }}>Company</th>
            <th style={{ padding: 8 }}>Role</th>
            <th style={{ padding: 8 }}>Status</th>
            <th style={{ padding: 8 }}>Interview URL</th>
            <th style={{ padding: 8 }}>Link Status</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} style={{ padding: 16, color: "#888" }}>
                Loading…
              </td>
            </tr>
          ) : interviews.length === 0 && !error ? (
            <tr>
              <td colSpan={6} style={{ padding: 16, color: "#888" }}>
                No interviews yet.
              </td>
            </tr>
          ) : (
            interviews.map((i) => {
              const interviewPath = `/interview/${i.room_name}?name=${encodeURIComponent(
                i.candidate_name
              )}`;
              const interviewUrl = `${WEB_URL}${interviewPath}`;
              return (
                <tr key={i.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{i.candidate_name}</td>
                  <td style={{ padding: 8 }}>{i.company_name ?? "—"}</td>
                  <td style={{ padding: 8 }}>{i.job_role}</td>
                  <td style={{ padding: 8 }}>{i.status}</td>
                  <td style={{ padding: 8, maxWidth: 220 }}>
                    <a
                      href={interviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={interviewUrl}
                      style={{
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {interviewUrl}
                    </a>
                  </td>
                  <td style={{ padding: 8 }}>
                    <ExpiryBadge scheduledEnd={i.scheduled_end} />
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </main>
  );
}
