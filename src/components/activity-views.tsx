"use client";

import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { SkylineDay } from "@/components/skyline";

// Three.js only loads when someone opens the 3D view.
const Skyline = dynamic(() => import("@/components/skyline"), {
  ssr: false,
  loading: () => <div aria-hidden className="h-72 animate-pulse rounded-2xl bg-white/10" />,
});

// Switches the contribution graph between the 2D heatmap (rendered on the
// server) and the 3D skyline. Clicking a bar opens that day, like the squares.
export function ActivityViews({
  heatmap,
  weeks,
  selectedDay,
  sort,
}: {
  heatmap: ReactNode;
  weeks: SkylineDay[][];
  selectedDay?: string;
  sort?: string;
}) {
  const [view, setView] = useState<"2d" | "3d">("2d");
  const router = useRouter();

  function openDay(date: string) {
    const params = new URLSearchParams();
    if (sort) params.set("sort", sort);
    if (date !== selectedDay) params.set("day", date);
    const query = params.toString();
    router.push(query ? `/dashboard?${query}` : "/dashboard", { scroll: false });
  }

  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label="Graph view" className="flex self-end rounded-full border border-white/15 bg-black/25 p-0.5 text-xs">
        {(["2d", "3d"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={view === option}
            onClick={() => setView(option)}
            className={`rounded-full px-3 py-1 font-medium uppercase transition-colors ${
              view === option ? "bg-white text-neutral-900" : "text-white/75 hover:text-white"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      {view === "2d" ? (
        heatmap
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20">
          <Skyline weeks={weeks} selectedDay={selectedDay} onSelect={openDay} />
          <p className="px-4 py-2 text-xs text-white/60">Drag to orbit · scroll to zoom · click a bar to open that day</p>
        </div>
      )}
    </div>
  );
}
