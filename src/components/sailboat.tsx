"use client";

import dynamic from "next/dynamic";

// Three.js loads after the page, so the homepage stays fast.
const SailboatScene = dynamic(() => import("@/components/sailboat-scene"), { ssr: false });

export function Sailboat({ intensity }: { intensity: number }) {
  return <SailboatScene intensity={intensity} />;
}
