"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function HomePage() {
  const [name, setName] = useState("");
  const router = useRouter();

  function startInterview() {
    if (!name.trim()) return;
    const roomName = `interview-${Date.now()}`;
    router.push(
      `/room/${roomName}?name=${encodeURIComponent(name)}`
    );
  }

  return (
    <main style={{ maxWidth: 420, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h1>AI Interview</h1>
      <p>Enter your name to begin your interview.</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your full name"
        style={{ width: "100%", padding: 8, marginBottom: 12 }}
      />
      <button onClick={startInterview} style={{ padding: "8px 16px" }}>
        Start Interview
      </button>
    </main>
  );
}
