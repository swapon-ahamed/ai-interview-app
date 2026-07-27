"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Interview = {
  room_name: string;
  candidate_name: string;
  job_role: string;
  status: string;
  score: { overall_score?: number } | null;
  created_at: string;
};

export default function DashboardPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/signin");
        return;
      }

      // Re-check in case an admin reverted this company to 'pending' after
      // this session was already established.
      const { data: company } = await supabase
        .from("companies")
        .select("status")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (company && company.status !== "active") {
        await supabase.auth.signOut();
        router.replace("/signin?pending=1");
        return;
      }

      setSession(session);
      setChecked(true);
      loadInterviews(session.access_token);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/signin");
    });

    return () => listener.subscription.unsubscribe();
  }, [router]);

  async function loadInterviews(accessToken: string) {
    setLoading(true);
    const res = await fetch("/api/interviews", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    setInterviews(data.interviews ?? []);
    setLoading(false);
  }

  if (!checked) return null;

  return (
    <main style={{ maxWidth: 720, margin: "60px auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>Interviews</h1>
          <p style={{ color: "#666" }}>
            Signed in as <strong>{session?.user.email}</strong>
          </p>
        </div>
        <Link
          href="/dashboard/create-interview"
          style={{
            padding: "8px 16px",
            background: "#000",
            color: "#fff",
            textDecoration: "none",
            borderRadius: 4,
          }}
        >
          + New Interview
        </Link>
      </div>

      <table style={{ width: "100%", marginTop: 20, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid #ccc" }}>
            <th style={{ padding: 8 }}>Candidate</th>
            <th style={{ padding: 8 }}>Role</th>
            <th style={{ padding: 8 }}>Status</th>
            <th style={{ padding: 8 }}>Score</th>
            <th style={{ padding: 8 }}>Interview URL</th>
            <th style={{ padding: 8 }}></th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} style={{ padding: 16, color: "#888" }}>
                Loading…
              </td>
            </tr>
          ) : interviews.length === 0 ? (
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
              const interviewUrl = `${window.location.origin}${interviewPath}`;
              return (
                <tr key={i.room_name} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>{i.candidate_name}</td>
                  <td style={{ padding: 8 }}>{i.job_role}</td>
                  <td style={{ padding: 8 }}>{i.status}</td>
                  <td style={{ padding: 8 }}>
                    {i.score?.overall_score ? `${i.score.overall_score}/5` : "—"}
                  </td>
                  <td style={{ padding: 8, maxWidth: 220 }}>
                    <a
                      href={interviewPath}
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
                    <Link href={`/report/${i.room_name}`}>View report</Link>
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
