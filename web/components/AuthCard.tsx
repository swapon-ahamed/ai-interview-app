// Shared layout + form styles for the company auth pages (signin, signup,
// forgot-password, auth/confirmed, auth/set-password) so they stay visually
// consistent with each other.

export const authTheme = {
  bg: "#0b0b12",
  surface: "#15151f",
  border: "#26262f",
  text: "#f5f5f7",
  muted: "#9a9aa8",
  error: "#f87171",
  success: "#4ade80",
};

export function AuthCard({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main style={{ background: authTheme.bg, color: authTheme.text, minHeight: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ maxWidth: 440, margin: "0 auto", padding: "64px 16px" }}>
        <h1 style={{ fontSize: 28 }}>{title}</h1>
        <div
          style={{
            background: authTheme.surface,
            border: `1px solid ${authTheme.border}`,
            borderRadius: 12,
            padding: 24,
            marginTop: 20,
          }}
        >
          {children}
        </div>
        {footer && <div style={{ marginTop: 24, fontSize: 14, color: authTheme.muted, lineHeight: 1.6 }}>{footer}</div>}
      </div>
    </main>
  );
}

export const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  color: "#c4c4d1",
  marginBottom: 6,
  marginTop: 16,
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 12px",
  borderRadius: 6,
  border: `1px solid ${authTheme.border}`,
  background: "#0f0f16",
  color: authTheme.text,
  fontSize: 14,
  fontFamily: "inherit",
};

export function primaryButtonStyle(disabled = false): React.CSSProperties {
  return {
    width: "100%",
    marginTop: 20,
    padding: "10px 0",
    background: "linear-gradient(135deg, #6366F1, #8B5CF6)",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: 15,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };
}

export const linkStyle: React.CSSProperties = { color: "#c4b5fd" };

export function Message({ kind, children }: { kind: "error" | "success" | "info"; children: React.ReactNode }) {
  const color = kind === "error" ? authTheme.error : kind === "success" ? authTheme.success : authTheme.muted;
  return (
    <p role={kind === "error" ? "alert" : undefined} style={{ color, marginTop: 12, fontSize: 14, lineHeight: 1.5 }}>
      {children}
    </p>
  );
}
