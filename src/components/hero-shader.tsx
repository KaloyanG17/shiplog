"use client";

import { useSyncExternalStore } from "react";
import { MeshGradient } from "@paper-design/shaders-react";

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(reducedMotionQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

// Animated WebGL gradient behind the hero. Decorative only; it holds still
// for visitors who ask their OS for reduced motion.
export function HeroShader() {
  const reduceMotion = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(reducedMotionQuery).matches,
    () => true, // server render: start still
  );

  return (
    <MeshGradient
      aria-hidden
      colors={["#f97316", "#0e7490", "#fde4c8", "#164e63", "#fb923c"]}
      distortion={0.85}
      swirl={0.6}
      speed={reduceMotion ? 0 : 0.25}
      className="absolute inset-0 h-full w-full"
    />
  );
}
