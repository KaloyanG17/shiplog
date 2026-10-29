"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Board, type BoardCard } from "./board";

// Three.js only loads when the galaxy is opened.
const Galaxy = dynamic(() => import("@/components/galaxy"), {
  ssr: false,
  loading: () => <div aria-hidden className="glass h-[36rem] animate-pulse rounded-3xl" />,
});

// Switches between the 2D kanban board and the 3D galaxy of the same cards.
export function BoardViews({ projectId, cards }: { projectId: string; cards: BoardCard[] }) {
  const [view, setView] = useState<"board" | "galaxy">("board");

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="Board view" className="glass flex self-start rounded-full p-1 text-sm">
        {(
          [
            ["board", "Board"],
            ["galaxy", "Galaxy"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={view === value}
            onClick={() => setView(value)}
            className={`rounded-full px-3 py-1 transition-colors ${
              view === value ? "bg-white font-medium text-neutral-900" : "text-white/80 hover:bg-white/10"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {view === "board" ? <Board projectId={projectId} cards={cards} /> : <Galaxy cards={cards} />}
    </div>
  );
}
