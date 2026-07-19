"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const AGENT_NAME = "Maya";

// --- Real-time audio level from an actual MediaStreamTrack (Maya's voice) ---
function useAudioLevel(track: MediaStreamTrack | undefined) {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!track) return;
    const ctx = new AudioContext();
    const stream = new MediaStream([track]);
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;
    dataRef.current = new Uint8Array(analyser.frequencyBinCount);

    return () => {
      ctx.close();
      analyserRef.current = null;
    };
  }, [track]);

  // Called every animation frame — returns 0..1 volume, not a React state (avoids re-renders)
  return () => {
    const analyser = analyserRef.current;
    const data = dataRef.current;
    if (!analyser || !data) return 0;
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / data.length);
  };
}

function Head({ getVolume }: { getVolume: () => number }) {
  const groupRef = useRef<THREE.Group>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const leftEyeRef = useRef<THREE.Mesh>(null);
  const rightEyeRef = useRef<THREE.Mesh>(null);
  const blinkClock = useRef(0);
  const mouthLevel = useRef(0);

  useFrame((state, delta) => {
    // Idle head sway
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.35) * 0.12;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.25) * 0.03;
    }

    // Mouth driven by Maya's actual live voice volume
    const target = Math.min(getVolume() * 6, 1);
    mouthLevel.current = THREE.MathUtils.lerp(mouthLevel.current, target, 0.4);
    if (mouthRef.current) {
      mouthRef.current.scale.y = 0.3 + mouthLevel.current * 1.8;
    }

    // Continuous natural blinking every ~4.5s
    blinkClock.current += delta;
    const cycle = blinkClock.current % 4.5;
    const blinkScale = cycle > 4.35 ? 0.1 : 1;
    if (leftEyeRef.current) leftEyeRef.current.scale.y = THREE.MathUtils.lerp(leftEyeRef.current.scale.y, blinkScale, 0.7);
    if (rightEyeRef.current) rightEyeRef.current.scale.y = THREE.MathUtils.lerp(rightEyeRef.current.scale.y, blinkScale, 0.7);
  });

  const skin = "#e8b48c";
  const hair = "#3b2a1e";

  return (
    <group ref={groupRef}>
      {/* head */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshStandardMaterial color={skin} roughness={0.6} />
      </mesh>

      {/* hair (top cap) */}
      <mesh position={[0, 0.55, -0.05]}>
        <sphereGeometry args={[1.03, 48, 48, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color={hair} roughness={0.8} />
      </mesh>

      {/* ears */}
      <mesh position={[-0.98, -0.05, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color={skin} roughness={0.6} />
      </mesh>
      <mesh position={[0.98, -0.05, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color={skin} roughness={0.6} />
      </mesh>

      {/* eyebrows */}
      <mesh position={[-0.32, 0.28, 0.88]} rotation={[0, 0, 0.1]}>
        <boxGeometry args={[0.28, 0.05, 0.05]} />
        <meshStandardMaterial color={hair} />
      </mesh>
      <mesh position={[0.32, 0.28, 0.88]} rotation={[0, 0, -0.1]}>
        <boxGeometry args={[0.28, 0.05, 0.05]} />
        <meshStandardMaterial color={hair} />
      </mesh>

      {/* eyes */}
      <mesh ref={leftEyeRef} position={[-0.32, 0.12, 0.93]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color="#2b2b2b" />
      </mesh>
      <mesh ref={rightEyeRef} position={[0.32, 0.12, 0.93]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color="#2b2b2b" />
      </mesh>

      {/* nose */}
      <mesh position={[0, -0.05, 0.98]}>
        <coneGeometry args={[0.08, 0.22, 16]} />
        <meshStandardMaterial color={skin} roughness={0.6} />
      </mesh>

      {/* mouth — scales on Y to "talk" */}
      <mesh ref={mouthRef} position={[0, -0.42, 0.9]}>
        <boxGeometry args={[0.32, 0.08, 0.05]} />
        <meshStandardMaterial color="#8a3b3b" />
      </mesh>
    </group>
  );
}

export function Avatar3D({ audioTrack, agentPresent }: { audioTrack?: MediaStreamTrack; agentPresent: boolean }) {
  const getVolume = useAudioLevel(audioTrack);

  return (
    <div style={{ position: "relative", height: "100%", background: "#111" }}>
      <Canvas camera={{ position: [0, 0, 3.2], fov: 35 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[2, 3, 4]} intensity={1.1} />
        <directionalLight position={[-2, 1, 2]} intensity={0.4} />
        <Head getVolume={getVolume} />
      </Canvas>
      <p
        style={{
          position: "absolute",
          bottom: 16,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 14,
          color: "#aaa",
          fontFamily: "sans-serif",
        }}
      >
        {agentPresent ? `${AGENT_NAME} — AI Interviewer` : `Waiting for ${AGENT_NAME} to join…`}
      </p>
    </div>
  );
}
