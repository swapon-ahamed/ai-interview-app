"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Template = {
  id: string;
  role: string;
  slug: string;
  skills: string[];
  duration_minutes: number;
  questions: string[];
};

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [skillsText, setSkillsText] = useState("");
  const [questionsText, setQuestionsText] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(6);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/signin");
        return;
      }
      setAccessToken(session.access_token);

      const res = await fetch(`/api/templates/${params.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        setError(res.status === 404 ? "Template not found." : "Failed to load template.");
        setLoading(false);
        return;
      }

      const data = await res.json();
      const t: Template = data.template;
      setTemplate(t);
      setSkillsText((t.skills ?? []).join(", "));
      setQuestionsText(t.questions.join("\n"));
      setDurationMinutes(t.duration_minutes);
      setLoading(false);
    });
  }, [router, params.id]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    const skills = skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const questions = questionsText
      .split("\n")
      .map((q) => q.trim())
      .filter(Boolean);

    if (questions.length === 0) {
      setError("At least one plan step is required.");
      return;
    }

    setSaving(true);
    const res = await fetch(`/api/templates/${params.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ skills, questions, durationMinutes }),
    });
    setSaving(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save changes.");
      return;
    }

    setSaved(true);
  }

  if (loading) return null;

  if (error && !template) {
    return (
      <main style={{ maxWidth: 560, margin: "60px auto", fontFamily: "sans-serif" }}>
        <p>{error}</p>
        <Link href="/dashboard/templates">Back to templates</Link>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 560, margin: "60px auto", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>{template?.role}</h1>
        <Link href="/dashboard/templates">← Templates</Link>
      </div>
      <p style={{ fontSize: 12, color: "#888" }}>
        /practice/{template?.slug} — the role name can&apos;t be changed since it&apos;s baked
        into this URL; remove and re-create the template to rename it.
      </p>

      <form onSubmit={handleSave}>
        <label style={{ display: "block", marginTop: 16 }}>Skill tags (comma-separated)</label>
        <input
          value={skillsText}
          onChange={(e) => setSkillsText(e.target.value)}
          style={{ width: "100%", padding: 8 }}
        />

        <label style={{ display: "block", marginTop: 16 }}>
          Interview plan (one instruction per line, in order)
        </label>
        <textarea
          value={questionsText}
          onChange={(e) => setQuestionsText(e.target.value)}
          rows={8}
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

        {error && <p style={{ color: "crimson", marginTop: 12 }}>{error}</p>}
        {saved && <p style={{ color: "green", marginTop: 12 }}>Saved.</p>}

        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button type="submit" disabled={saving} style={{ padding: "8px 16px" }}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
          <Link href="/dashboard/templates" style={{ alignSelf: "center" }}>
            Back to templates
          </Link>
        </div>
      </form>
    </main>
  );
}
