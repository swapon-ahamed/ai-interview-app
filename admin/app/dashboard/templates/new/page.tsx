"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function NewTemplatePage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [role, setRole] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [questionsText, setQuestionsText] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(6);
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
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const skills = skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const questions = questionsText
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean);

    if (!role.trim() || questions.length === 0) {
      setError("Role and at least one plan step are required.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ role, skills, questions, durationMinutes }),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create template.");
      return;
    }

    router.push("/dashboard/templates");
  }

  if (!checked) return null;

  return (
    <main style={{ maxWidth: 560, margin: "60px auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>New Practice Template</h1>
        <Link href="/dashboard/templates">← Templates</Link>
      </div>

      <form onSubmit={handleCreate}>
        <label style={{ display: "block", marginTop: 16 }}>Role *</label>
        <input
          required
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="e.g. Support Engineer"
          style={{ width: "100%", padding: 8 }}
        />

        <label style={{ display: "block", marginTop: 16 }}>Skill tags (comma-separated)</label>
        <input
          value={skillsText}
          onChange={(e) => setSkillsText(e.target.value)}
          placeholder="e.g. Debugging, Customer empathy, Prioritization"
          style={{ width: "100%", padding: 8 }}
        />
        <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
          Shown as short tags on the public /practice catalog cards.
        </p>

        <label style={{ display: "block", marginTop: 16 }}>
          Interview plan (one instruction per line, in order)
        </label>
        <textarea
          value={questionsText}
          onChange={(e) => setQuestionsText(e.target.value)}
          rows={8}
          placeholder={"Ask the candidate to introduce themselves.\nAsk about...\n..."}
          style={{ width: "100%", padding: 8, fontFamily: "monospace" }}
        />

        <label style={{ display: "block", marginTop: 16 }}>Practice session length (minutes)</label>
        <input
          type="number"
          min={1}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(Number(e.target.value))}
          style={{ width: "100%", padding: 8 }}
        />

        {error && <p style={{ color: "crimson", marginTop: 16 }}>{error}</p>}

        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button type="submit" disabled={loading} style={{ padding: "8px 16px" }}>
            {loading ? "Creating…" : "Create Template"}
          </button>
          <Link href="/dashboard/templates" style={{ alignSelf: "center" }}>
            Cancel
          </Link>
        </div>
      </form>
    </main>
  );
}
