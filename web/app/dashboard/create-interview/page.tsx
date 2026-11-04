"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Template = { id: string; role: string; questions: string[] };

export default function CreateInterviewPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [candidateName, setCandidateName] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [questionsText, setQuestionsText] = useState("");
  const [scheduledStart, setScheduledStart] = useState("");
  const [scheduledEnd, setScheduledEnd] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(2);
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/signin");
        return;
      }
      setAccessToken(session.access_token);
      setChecked(true);
    });

    fetch("/api/templates")
      .then((res) => res.json())
      .then((data) => setTemplates(data.templates ?? []));

    // Default window: opens now, active for 3 hours
    const toLocalInputValue = (d: Date) => {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
        d.getHours()
      )}:${pad(d.getMinutes())}`;
    };
    const now = new Date();
    const threeHoursLater = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    setScheduledStart(toLocalInputValue(now));
    setScheduledEnd(toLocalInputValue(threeHoursLater));
  }, [router]);

  function applyTemplate(templateId: string) {
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    setJobRole(t.role);
    setQuestionsText(t.questions.join("\n"));
  }

  async function createInterview() {
    setError(null);

    if (!candidateName.trim() || !jobRole.trim()) {
      setError("Candidate name and job role are required.");
      return;
    }
    if (!accessToken) {
      setError("Your session has expired — please sign in again.");
      return;
    }

    setLoading(true);
    const questions = questionsText
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean);

    let res: Response;
    try {
      res = await fetch("/api/interviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          candidateName,
          jobRole,
          questions,
          scheduledStart,
          scheduledEnd,
          durationMinutes,
        }),
      });
    } catch {
      setLoading(false);
      setError("Network error — could not reach the server. Please try again.");
      return;
    }

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok || !data.roomName) {
      setError(data.error ?? "Failed to create the interview. Please try again.");
      return;
    }

    setLink(
      `${window.location.origin}/interview/${data.roomName}?name=${encodeURIComponent(
        candidateName
      )}`
    );
  }

  if (!checked) return null;

  return (
    <main style={{ maxWidth: 560, margin: "60px auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Create an AI Interview</h1>
        <Link href="/dashboard">← Dashboard</Link>
      </div>

      <label style={{ display: "block", marginTop: 16 }}>Candidate name</label>
      <input
        value={candidateName}
        onChange={(e) => setCandidateName(e.target.value)}
        placeholder="e.g. Jane Doe"
        style={{ width: "100%", padding: 8 }}
      />

      <label style={{ display: "block", marginTop: 16 }}>Start from a template</label>
      <select
        onChange={(e) => applyTemplate(e.target.value)}
        defaultValue=""
        style={{ width: "100%", padding: 8 }}
      >
        <option value="" disabled>
          Choose a template (optional)
        </option>
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.role}
          </option>
        ))}
      </select>

      <label style={{ display: "block", marginTop: 16 }}>Job role</label>
      <input
        value={jobRole}
        onChange={(e) => setJobRole(e.target.value)}
        placeholder="e.g. Backend Software Engineer"
        style={{ width: "100%", padding: 8 }}
      />

      <label style={{ display: "block", marginTop: 16 }}>
        Interview questions/instructions (one per line — these are instructions to
        the AI interviewer, not exact scripted questions)
      </label>
      <textarea
        value={questionsText}
        onChange={(e) => setQuestionsText(e.target.value)}
        rows={8}
        placeholder={"Ask the candidate to introduce themselves.\nAsk about...\n..."}
        style={{ width: "100%", padding: 8, fontFamily: "monospace" }}
      />

      <label style={{ display: "block", marginTop: 16 }}>Interview window opens</label>
      <input
        type="datetime-local"
        value={scheduledStart}
        onChange={(e) => setScheduledStart(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />

      <label style={{ display: "block", marginTop: 16 }}>Interview window closes</label>
      <input
        type="datetime-local"
        value={scheduledEnd}
        onChange={(e) => setScheduledEnd(e.target.value)}
        style={{ width: "100%", padding: 8 }}
      />
      <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
        The candidate's link only works between these two times. Defaults to opening now and
        closing in 3 hours.
      </p>

      <label style={{ display: "block", marginTop: 16 }}>Session duration (minutes)</label>
      <input
        type="number"
        min={1}
        value={durationMinutes}
        onChange={(e) => setDurationMinutes(Number(e.target.value))}
        style={{ width: "100%", padding: 8 }}
      />
      <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
        The AI interviewer will wrap up and end the call automatically after this many minutes.
      </p>

      {error && <p style={{ color: "crimson", marginTop: 16 }}>{error}</p>}

      <button
        onClick={createInterview}
        disabled={loading}
        style={{ padding: "8px 16px", marginTop: 20 }}
      >
        {loading ? "Creating…" : "Create Interview Link"}
      </button>

      {link && (
        <div style={{ marginTop: 24, padding: 12, background: "#f2f2f2" }}>
          <p>Send this link to the candidate:</p>
          <code style={{ wordBreak: "break-all" }}>{link}</code>
          <p style={{ marginTop: 12 }}>
            <Link href="/dashboard">Back to dashboard</Link>
          </p>
        </div>
      )}
    </main>
  );
}
