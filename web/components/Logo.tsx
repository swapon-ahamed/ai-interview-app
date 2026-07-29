import Image from "next/image";

// Icon mark lives at public/logo.png (also used as web/app/icon.png favicon).
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

export default function Logo({
  size = 28,
  wordmark = "AI Interview",
  dark = false,
}: {
  size?: number;
  wordmark?: string;
  // For use on dark marketing backgrounds (web/app/page.tsx, /book-demo) —
  // the default black wordmark text is invisible there.
  dark?: boolean;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <LogoMark size={size} />
      <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: -0.2 }}>
        <span style={{ color: dark ? "#A78BFA" : "#4338CA" }}>AI</span>{" "}
        <span style={{ color: dark ? "#fff" : "#000" }}>{wordmark.replace(/^AI\s/, "")}</span>
      </span>
    </span>
  );
}
