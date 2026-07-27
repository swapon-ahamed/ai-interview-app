import Link from "next/link";

export default function WelcomePage() {
  return (
    <main style={{ maxWidth: 720, margin: "60px auto", fontFamily: "sans-serif", padding: "0 24px" }}>
      <h1>AI-Powered Interviews, End to End</h1>
      <p style={{ fontSize: 18, color: "#444", marginTop: 12 }}>
        Create an interview link, send it to a candidate, and let an AI interviewer conduct
        the conversation — live, over voice and video. Every session is transcribed and
        scored automatically, so your team gets a ready-to-read report instead of raw notes.
      </p>

      <section style={{ marginTop: 40 }}>
        <h2>How it works</h2>
        <ol style={{ color: "#444", lineHeight: 1.8 }}>
          <li>Sign in to your company dashboard and create an interview — pick a role,
            a question template (or write your own), and an active time window.</li>
          <li>Send the generated link to your candidate.</li>
          <li>The candidate joins in their browser and talks with the AI interviewer,
            which asks questions, listens, and adapts in real time.</li>
          <li>When it's done, review the transcript and an automatically generated
            scorecard from your dashboard.</li>
        </ol>
      </section>

      <section style={{ marginTop: 40, padding: 20, background: "#f7f7f7", borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>For companies</h2>
        <p style={{ color: "#444" }}>
          Company accounts are created by an administrator. If your company has already been
          registered, sign in below to create interviews and view reports.
        </p>
        <Link
          href="/signin"
          style={{
            display: "inline-block",
            marginTop: 12,
            padding: "10px 20px",
            background: "#000",
            color: "#fff",
            textDecoration: "none",
            borderRadius: 4,
          }}
        >
          Company Sign In
        </Link>
      </section>
    </main>
  );
}
