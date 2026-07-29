import Link from "next/link";
import type { Metadata } from "next";
import { LiveInterviewPreview } from "@/components/LiveInterviewPreview";

export const metadata: Metadata = {
  title: "AI-Powered Interviews, End to End",
  description:
    "Create an AI-conducted interview link for your candidates in seconds, with automatic transcripts and scorecards — or try a free, no-signup AI practice interview first.",
  alternates: { canonical: "/" },
};

const page = {
  bg: "#0b0b12",
  surface: "#15151f",
  border: "#26262f",
  text: "#f5f5f7",
  muted: "#9a9aa8",
  accent: "#8B5CF6",
};

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontSize: 13,
        fontWeight: 600,
        color: "#c4b5fd",
        background: "rgba(139,92,246,0.15)",
        padding: "5px 14px",
        borderRadius: 999,
      }}
    >
      {children}
    </span>
  );
}

function PrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-block",
        padding: "12px 22px",
        background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
        color: "#fff",
        textDecoration: "none",
        borderRadius: 8,
        fontWeight: 600,
        fontSize: 15,
      }}
    >
      {children}
    </Link>
  );
}

function SecondaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-block",
        padding: "12px 22px",
        background: "transparent",
        color: page.text,
        border: `1px solid ${page.border}`,
        textDecoration: "none",
        borderRadius: 8,
        fontWeight: 600,
        fontSize: 15,
      }}
    >
      {children}
    </Link>
  );
}

const FEATURES = [
  {
    icon: "🧩",
    title: "AI-led interviews",
    body: "Structured, adaptive questioning that goes deep on real skills, not rehearsed answers.",
  },
  {
    icon: "📊",
    title: "Automatic scoring",
    body: "Every response scored against your rubric — consistent across every candidate, every time.",
  },
  {
    icon: "🎬",
    title: "Video & transcript review",
    body: "Rewatch any moment or skim the full transcript in seconds, no scrubbing required.",
  },
  {
    icon: "🛡",
    title: "Fraud & proctoring signals",
    body: "Flags impersonation, lookaways, and copied answers as the interview happens.",
  },
  {
    icon: "🌐",
    title: "Multilingual interviews",
    body: "Runs in 40+ languages against the same rubric, so results stay comparable worldwide.",
  },
  {
    icon: "🔌",
    title: "ATS integrations",
    body: "Pushes scorecards straight into the tools your recruiting team already lives in.",
  },
];

const TRACKS = [
  { icon: "</>", title: "Software & product", body: "System design, behavioral, and role-specific technical questions.", q: "Engineer" },
  { icon: "💼", title: "General behavioral", body: "STAR-style prompts on teamwork, conflict, and ownership.", q: "" },
  { icon: "📣", title: "Sales & customer-facing", body: "Pitch, objection-handling, and discovery-call scenarios.", q: "Sales" },
];

const STEPS = [
  { n: 1, title: "Send the link", body: "Candidates start from any device, any timezone — no app or download." },
  { n: 2, title: "AI conducts the interview", body: "Follow-up questions adapt to each answer in real time, just like a strong human interviewer." },
  { n: 3, title: "Get scored results", body: "A structured scorecard lands in your dashboard within minutes of the call ending." },
  { n: 4, title: "Decide with confidence", body: "Compare candidates side by side on the same rubric and move your best forward." },
];

const PLANS = [
  {
    tier: "STARTER",
    price: "$0",
    blurb: "Try it on a single open role.",
    features: ["Up to 10 interviews/mo", "1 interview rubric", "Video + transcript review", "Email support"],
    cta: "Start free",
    href: "/signin",
    highlight: false,
  },
  {
    tier: "GROWTH",
    price: "$399",
    blurb: "For teams hiring across several roles.",
    features: ["Unlimited interviews", "Custom rubrics per role", "Fraud & proctoring signals", "ATS integrations", "Priority support"],
    cta: "Book a demo",
    href: "/book-demo",
    highlight: true,
  },
  {
    tier: "ENTERPRISE",
    price: "Custom",
    blurb: "Volume hiring with dedicated support.",
    features: ["Everything in Growth", "SSO & audit logs", "Dedicated success manager", "Custom SLAs & onboarding"],
    cta: "Talk to sales",
    href: "/book-demo",
    highlight: false,
  },
];

export default function WelcomePage() {
  return (
    <main style={{ background: page.bg, color: page.text, fontFamily: "sans-serif" }}>
      {/* Hero */}
      <section style={{ maxWidth: 1160, margin: "0 auto", padding: "64px 32px 48px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 48, alignItems: "start" }}>
          <div>
            <Pill>AI-run interviews, human-grade signal</Pill>
            <h1 style={{ fontSize: 48, lineHeight: 1.1, marginTop: 20, marginBottom: 20 }}>
              AI-Powered Interviews, End to End
            </h1>
            <p style={{ fontSize: 17, color: page.muted, lineHeight: 1.6, maxWidth: 520 }}>
              Create an interview link, send it to a candidate, and let an AI interviewer conduct
              the conversation — live, over voice and video. Every session is transcribed and
              scored automatically, so your team gets a ready-to-read report instead of raw notes.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
              <PrimaryButton href="/book-demo">Book a demo</PrimaryButton>
              <SecondaryButton href="/live-interview">See a live interview →</SecondaryButton>
            </div>

            <div style={{ display: "flex", gap: 40, marginTop: 44 }}>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>40+</div>
                <div style={{ fontSize: 13, color: page.muted }}>languages supported</div>
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>6 min</div>
                <div style={{ fontSize: 13, color: page.muted }}>avg. time to first score</div>
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>98%</div>
                <div style={{ fontSize: 13, color: page.muted }}>candidates complete on first try</div>
              </div>
            </div>
          </div>

          <LiveInterviewPreview />
        </div>
      </section>

      {/* Customers */}
      <section id="customers" style={{ borderTop: `1px solid ${page.border}`, padding: "32px 32px" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", textAlign: "center" }}>
          <div style={{ fontSize: 12, letterSpacing: 1.5, color: page.muted, marginBottom: 20 }}>
            TRUSTED BY TALENT TEAMS AT
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap", color: "#5c5c68", fontWeight: 600 }}>
            <span>Northwind</span>
            <span>Fenwick</span>
            <span>Loop Robotics</span>
            <span>Cobalt</span>
            <span>Marrow Health</span>
            <span>Delta Systems</span>
          </div>
        </div>
      </section>

      {/* Platform */}
      <section id="product" style={{ padding: "72px 32px" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: page.accent, letterSpacing: 1 }}>PLATFORM</div>
          <h2 style={{ fontSize: 32, marginTop: 8, maxWidth: 640 }}>
            Everything a hiring team needs, nothing a candidate has to install
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 16, marginTop: 36 }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{ background: page.surface, border: `1px solid ${page.border}`, borderRadius: 10, padding: 20 }}>
                <div style={{ fontSize: 20, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 14, color: page.muted, lineHeight: 1.5 }}>{f.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Free practice */}
      <section style={{ padding: "72px 32px", borderTop: `1px solid ${page.border}` }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }}>
          <div>
            <Pill>Free, no signup required</Pill>
            <h2 style={{ fontSize: 30, marginTop: 20, lineHeight: 1.2 }}>
              Practice a real AI interview before the one that counts
            </h2>
            <p style={{ color: page.muted, marginTop: 16, lineHeight: 1.6 }}>
              Run a short mock interview with the same AI interviewer candidates meet in a real
              session. Get instant feedback on clarity, structure, and pacing — no account needed.
            </p>
            <div style={{ marginTop: 20 }}>
              <SecondaryButton href="/practice">Start free practice →</SecondaryButton>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {TRACKS.map((t) => (
              <Link
                key={t.title}
                href={t.q ? `/practice?q=${encodeURIComponent(t.q)}` : "/practice"}
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  background: page.surface,
                  border: `1px solid ${page.border}`,
                  borderRadius: 10,
                  padding: 16,
                  textDecoration: "none",
                  color: page.text,
                }}
              >
                <span style={{ fontSize: 16 }}>{t.icon}</span>
                <span>
                  <div style={{ fontWeight: 700 }}>{t.title}</div>
                  <div style={{ fontSize: 13, color: page.muted, marginTop: 2 }}>{t.body}</div>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" style={{ padding: "72px 32px", borderTop: `1px solid ${page.border}` }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: page.accent, letterSpacing: 1 }}>HOW IT WORKS</div>
          <h2 style={{ fontSize: 32, marginTop: 8, maxWidth: 560 }}>
            From job req to ranked shortlist in four steps
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 24, marginTop: 40 }}>
            {STEPS.map((s) => (
              <div key={s.n}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: `1px solid ${page.accent}`,
                    color: page.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 700,
                    marginBottom: 14,
                  }}
                >
                  {s.n}
                </div>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{s.title}</div>
                <div style={{ fontSize: 14, color: page.muted, lineHeight: 1.5 }}>{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section style={{ background: "linear-gradient(135deg, #312e81, #4c1d95)", padding: "48px 32px" }}>
        <div
          style={{
            maxWidth: 1160,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 20,
          }}
        >
          <div>
            <h2 style={{ fontSize: 26, margin: 0 }}>See Ayesha run a real interview</h2>
            <p style={{ color: "#d8d4f7", marginTop: 8, maxWidth: 480 }}>
              Fifteen minutes, your rubric or ours. Walk away with a scorecard for a real
              candidate profile.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
            <Link
              href="/book-demo"
              style={{
                padding: "12px 22px",
                background: "#fff",
                color: "#312e81",
                textDecoration: "none",
                borderRadius: 8,
                fontWeight: 700,
              }}
            >
              Book a demo
            </Link>
            <Link
              href="/practice"
              style={{
                padding: "12px 22px",
                background: "transparent",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.4)",
                textDecoration: "none",
                borderRadius: 8,
                fontWeight: 700,
              }}
            >
              Try the candidate demo
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ padding: "72px 32px", textAlign: "center" }}>
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: page.accent, letterSpacing: 1 }}>PRICING</div>
          <h2 style={{ fontSize: 32, marginTop: 8 }}>Priced for one req or a thousand</h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginTop: 40, textAlign: "left" }}>
            {PLANS.map((p) => (
              <div
                key={p.tier}
                style={{
                  background: page.surface,
                  border: `1px solid ${p.highlight ? page.accent : page.border}`,
                  borderRadius: 12,
                  padding: 24,
                  position: "relative",
                }}
              >
                {p.highlight && (
                  <span
                    style={{
                      position: "absolute",
                      top: -12,
                      right: 20,
                      background: page.accent,
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 999,
                    }}
                  >
                    Most popular
                  </span>
                )}
                <div style={{ fontSize: 12, fontWeight: 700, color: page.muted, letterSpacing: 1 }}>{p.tier}</div>
                <div style={{ fontSize: 32, fontWeight: 800, marginTop: 10 }}>
                  {p.price}
                  {p.price !== "Custom" && <span style={{ fontSize: 14, color: page.muted, fontWeight: 400 }}> / month</span>}
                </div>
                <div style={{ fontSize: 14, color: page.muted, marginTop: 8 }}>{p.blurb}</div>
                <ul style={{ listStyle: "none", padding: 0, marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                  {p.features.map((f) => (
                    <li key={f} style={{ fontSize: 14, display: "flex", gap: 8 }}>
                      <span style={{ color: page.accent }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <div style={{ marginTop: 24 }}>
                  {p.highlight ? (
                    <PrimaryButton href={p.href}>{p.cta}</PrimaryButton>
                  ) : (
                    <SecondaryButton href={p.href}>{p.cta}</SecondaryButton>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 13, color: page.muted, marginTop: 28 }}>
            Plans above are indicative — every account is currently set up by hand, so book a
            demo and we'll confirm pricing for your volume.
          </p>
        </div>
      </section>

    </main>
  );
}
