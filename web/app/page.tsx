"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Template = { id: string; role: string; questions: string[] };

export default function HomePage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [candidateName, setCandidateName] = useState("");
  const [jobRole, setJobRole] = useState("");
  const [questionsText, setQuestionsText] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/templates")
      .then((res) => res.json())
      .then((data) => setTemplates(data.templates ?? []));
  }, []);

  function applyTemplate(templateId: string) {
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    setJobRole(t.role);
    setQuestionsText(t.questions.join("\n"));
  }

  async function createInterview() {
    if (!candidateName.trim() || !jobRole.trim()) return;
    setLoading(true);
    const questions = questionsText
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean);

    const res = await fetch("/api/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ candidateName, jobRole, questions }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.roomName) {
      setLink(
        `${window.location.origin}/interview/${data.roomName}?name=${encodeURIComponent(
          candidateName
        )}`
      );
    }
  }

  return (
    <main style={{ maxWidth: 560, margin: "60px auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Create an AI Interview</h1>
        <Link href="/dashboard">Dashboard →</Link>
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
        </div>
      )}
    </main>
  );
}
