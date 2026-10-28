"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import type { ContributionLevel } from "@/lib/contributions";
import { useReducedMotion } from "@/lib/use-reduced-motion";

export type SkylineDay = {
  date: string;
  weekday: number;
  contributionCount: number;
  contributionLevel: ContributionLevel;
};

// Same teal-to-orange scale as the 2D heatmap.
const LEVEL_COLOR: Record<ContributionLevel, string> = {
  NONE: "#3a4248",
  FIRST_QUARTILE: "#155e75",
  SECOND_QUARTILE: "#06b6d4",
  THIRD_QUARTILE: "#fb923c",
  FOURTH_QUARTILE: "#f97316",
};

const SPACING = 1.15;
const MAX_HEIGHT = 9;

// One instanced mesh draws every day as a bar; heights grow in on mount.
function Bars({
  weeks,
  selectedDay,
  onSelect,
  animate,
}: {
  weeks: SkylineDay[][];
  selectedDay?: string;
  onSelect: (date: string) => void;
  animate: boolean;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const progress = useRef(animate ? 0 : 1);
  const [hovered, setHovered] = useState<number | null>(null);

  const days = useMemo(() => {
    const max = Math.max(1, ...weeks.flat().map((day) => day.contributionCount));
    return weeks.flatMap((week, w) =>
      week.map((day) => ({
        ...day,
        x: (w - weeks.length / 2) * SPACING,
        z: (day.weekday - 3) * SPACING,
        // Square root keeps one huge day from flattening everything else.
        height: day.contributionCount === 0 ? 0.15 : 0.6 + Math.sqrt(day.contributionCount / max) * MAX_HEIGHT,
      })),
    );
  }, [weeks]);

  // Colours once; the selected day is drawn white.
  useEffect(() => {
    const color = new THREE.Color();
    days.forEach((day, i) => {
      color.set(day.date === selectedDay ? "#ffffff" : LEVEL_COLOR[day.contributionLevel]);
      mesh.current?.setColorAt(i, color);
    });
    if (mesh.current?.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  }, [days, selectedDay]);

  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const scale = useMemo(() => new THREE.Vector3(), []);
  const position = useMemo(() => new THREE.Vector3(), []);
  const rotation = useMemo(() => new THREE.Quaternion(), []);

  useFrame((_, delta) => {
    if (!mesh.current) return;
    if (progress.current < 1) progress.current = Math.min(1, progress.current + delta * 0.9);
    const eased = 1 - Math.pow(1 - progress.current, 3);
    days.forEach((day, i) => {
      const lift = i === hovered ? 1.15 : 1;
      const height = Math.max(0.05, day.height * eased * lift);
      position.set(day.x, height / 2, day.z);
      scale.set(0.9, height, 0.9);
      mesh.current!.setMatrixAt(i, matrix.compose(position, rotation, scale));
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  const hoveredDay = hovered === null ? null : days[hovered];

  return (
    <>
      <instancedMesh
        ref={mesh}
        args={[undefined, undefined, days.length]}
        onPointerMove={(event: ThreeEvent<PointerEvent>) => {
          event.stopPropagation();
          setHovered(event.instanceId ?? null);
        }}
        onPointerOut={() => setHovered(null)}
        onClick={(event: ThreeEvent<MouseEvent>) => {
          event.stopPropagation();
          if (event.instanceId !== undefined) onSelect(days[event.instanceId].date);
        }}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial roughness={0.35} metalness={0.15} />
      </instancedMesh>

      {hoveredDay && (
        <Html position={[hoveredDay.x, hoveredDay.height + 1.2, hoveredDay.z]} center style={{ pointerEvents: "none" }}>
          <div className="glass whitespace-nowrap rounded-full px-3 py-1 text-xs text-white">
            {hoveredDay.contributionCount} contribution{hoveredDay.contributionCount === 1 ? "" : "s"} ·{" "}
            {new Date(`${hoveredDay.date}T00:00:00Z`).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              timeZone: "UTC",
            })}
          </div>
        </Html>
      )}
    </>
  );
}

// The contribution heatmap as a 3D city: one bar per day, height = activity.
export default function Skyline({
  weeks,
  selectedDay,
  onSelect,
}: {
  weeks: SkylineDay[][];
  selectedDay?: string;
  onSelect: (date: string) => void;
}) {
  const reducedMotion = useReducedMotion();

  return (
    <Canvas
      camera={{ position: [0, 17, 31], fov: 40 }}
      dpr={[1, 2]}
      className="!h-72 w-full cursor-grab active:cursor-grabbing"
      fallback={<p className="p-4 text-sm text-white/70">3D view needs WebGL, which this browser doesn&apos;t support.</p>}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[20, 30, 15]} intensity={1.6} />
      <pointLight position={[-25, 12, -10]} intensity={60} color="#22d3ee" />
      <Bars weeks={weeks} selectedDay={selectedDay} onSelect={onSelect} animate={!reducedMotion} />
      <mesh rotation-x={-Math.PI / 2} position-y={-0.01}>
        <planeGeometry args={[weeks.length * SPACING + 6, 7 * SPACING + 6]} />
        <meshStandardMaterial color="#0b1a22" transparent opacity={0.55} />
      </mesh>
      <OrbitControls
        enablePan={false}
        enableDamping
        minDistance={12}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2.2}
        autoRotate={!reducedMotion}
        autoRotateSpeed={0.35}
      />
    </Canvas>
  );
}
