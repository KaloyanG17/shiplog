"use client";

import { MeshGradient } from "@paper-design/shaders-react";
import { useReducedMotion } from "@/lib/use-reduced-motion";

// Animated WebGL gradient behind the hero. Decorative only; it holds still
// for visitors who ask their OS for reduced motion.
export function HeroShader() {
  const reduceMotion = useReducedMotion();

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
