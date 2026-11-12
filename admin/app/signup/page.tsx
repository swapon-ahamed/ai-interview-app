import Link from "next/link";

// Public admin signup was removed: anyone could create an account here and
// get full admin access. Admins are now invite-only (/dashboard/admins).
// This page stays so old links/bookmarks explain what changed.
export default function SignupPage() {
  return (
    <main style={{ maxWidth: 400, margin: "80px auto", padding: "0 16px", fontFamily: "sans-serif" }}>
      <h1>Admin accounts are invite-only</h1>
      <p style={{ marginTop: 16, lineHeight: 1.6 }}>
        New admins are added by an existing admin, who sends an invite to your email. Open that
        email to verify your address and choose a password.
      </p>
      <p style={{ marginTop: 16, lineHeight: 1.6 }}>
        Signing up a company? Use the{" "}
        <a href={`${process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000"}/signup`}>
          company sign-up page
        </a>
        .
      </p>
      <p style={{ marginTop: 24, fontSize: 14 }}>
        Already have an admin account? <Link href="/signin">Sign in</Link>
      </p>
    </main>
  );
}
