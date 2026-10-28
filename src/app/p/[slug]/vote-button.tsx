"use client";

import { useOptimistic, useTransition } from "react";
import { toggleVoteAction } from "./actions";

// Upvote pill; the count updates instantly and is saved in the background.
export function VoteButton({ cardId, votes, voted, title }: { cardId: string; votes: number; voted: boolean; title: string }) {
  const [state, toggle] = useOptimistic({ votes, voted }, (current) => ({
    voted: !current.voted,
    votes: current.votes + (current.voted ? -1 : 1),
  }));
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-pressed={state.voted}
      aria-label={`${state.voted ? "Remove your vote for" : "Upvote"} "${title}" (${state.votes} vote${state.votes === 1 ? "" : "s"})`}
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          toggle(null);
          await toggleVoteAction(cardId);
        })
      }
      className={`flex w-14 shrink-0 flex-col items-center rounded-2xl border py-1.5 text-sm font-semibold transition-colors ${
        state.voted
          ? "border-transparent bg-gradient-to-b from-orange-400 to-orange-600 text-white"
          : "border-white/25 text-white hover:bg-white/10"
      }`}
    >
      <span aria-hidden>▲</span>
      {state.votes}
    </button>
  );
}
