"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";

// Tilts its content toward the mouse in 3D. Mouse only (touch scrolls as
// normal), and off for visitors who prefer reduced motion.
export function Tilt({
  children,
  className = "",
  maxDegrees = 10,
}: {
  children: ReactNode;
  className?: string;
  maxDegrees?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || event.pointerType !== "mouse") return;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--tilt-y", `${x * maxDegrees}deg`);
    el.style.setProperty("--tilt-x", `${-y * maxDegrees}deg`);
  }

  function onPointerLeave() {
    ref.current?.style.setProperty("--tilt-x", "0deg");
    ref.current?.style.setProperty("--tilt-y", "0deg");
  }

  return (
    <div ref={ref} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} className={`[perspective:900px] ${className}`}>
      <div className="h-full transition-transform duration-200 ease-out [transform-style:preserve-3d] [transform:rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))] motion-reduce:[transform:none]">
        {children}
      </div>
    </div>
  );
}
