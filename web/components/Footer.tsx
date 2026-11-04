"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const page = {
  border: "#26262f",
  muted: "#9a9aa8",
};

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "PRODUCT",
    links: [
      { label: "Features", href: "/#product" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Live demo", href: "/live-interview" },
    ],
  },
  {
    title: "COMPANY",
    links: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Contact", href: "/book-demo" },
    ],
  },
  {
    title: "RESOURCES",
    links: [
      { label: "Blog", href: "#" },
      { label: "Help center", href: "#" },
      { label: "API docs", href: "#" },
    ],
  },
];

// Shown on every page via the root layout — except the live call UI
// (/interview, /room), which is a fixed-height video-call screen that a
// footer would push out of the viewport.
export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/interview") || pathname.startsWith("/room")) return null;

  return (
    <footer style={{ background: "#0b0b12", color: "#f5f5f7", borderTop: `1px solid ${page.border}`, padding: "40px 32px", fontFamily: "sans-serif" }}>
      <div
        style={{
          maxWidth: 1160,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
          gap: 24,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>AI Interview</div>
          <p style={{ fontSize: 13, color: page.muted, marginTop: 8, maxWidth: 240 }}>
            AI-run interviews with human-grade signal, for teams hiring at any scale.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <FooterColumn key={col.title} title={col.title} links={col.links} />
        ))}
      </div>
      <div
        style={{
          maxWidth: 1160,
          margin: "32px auto 0",
          paddingTop: 20,
          borderTop: `1px solid ${page.border}`,
          fontSize: 13,
          color: page.muted,
        }}
      >
        © {new Date().getFullYear()} AI Interview. All rights reserved.
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { label: string; href: string }[] }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#8b8b98", letterSpacing: 1 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
        {links.map((l) => (
          <Link key={l.label} href={l.href} style={{ fontSize: 14, color: "#c4c4d1", textDecoration: "none" }}>
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
