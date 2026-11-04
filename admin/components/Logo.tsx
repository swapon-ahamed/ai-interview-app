import Image from "next/image";

// Same mark as web/components/Logo.tsx — kept as its own copy since the two
// apps don't share a package, same as lib/supabase.ts. Keep both in sync.
// Icon lives at public/logo.png (also used as admin/app/icon.png favicon).
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <Image
      src="/logo.png"
      alt=""
      width={size}
      height={size}
      style={{ objectFit: "contain" }}
      priority
    />
  );
}

export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <LogoMark size={size} />
      <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: -0.2 }}>
        <span style={{ color: "#4338CA" }}>AI</span> <span style={{ color: "#000" }}>Interview</span>
      </span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: "#4338CA",
          background: "#EDE9FE",
          padding: "2px 8px",
          borderRadius: 999,
          letterSpacing: 0.3,
        }}
      >
        ADMIN
      </span>
    </span>
  );
}
