"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { CardColumn, PrChecks, PrReview } from "@/generated/prisma/enums";
import { addCardAction, deleteCardAction, moveCardAction } from "./actions";

export type BoardCard = {
  id: string;
  title: string;
  column: CardColumn;
  position: number;
  issueNumber: number | null;
  url: string | null;
  prNumber: number | null;
  prUrl: string | null;
  prChecks: PrChecks | null;
  prReview: PrReview | null;
};

const CHECKS: Record<PrChecks, { label: string; dot: string }> = {
  PENDING: { label: "Checks running", dot: "bg-amber-300 animate-pulse motion-reduce:animate-none" },
  SUCCESS: { label: "Checks passed", dot: "bg-emerald-400" },
  FAILURE: { label: "Checks failed", dot: "bg-red-400" },
};

const REVIEWS: Record<PrReview, { label: string; className: string }> = {
  APPROVED: { label: "Approved", className: "bg-emerald-400/15 text-emerald-200" },
  CHANGES_REQUESTED: { label: "Changes requested", className: "bg-red-400/15 text-red-200" },
};

const COLUMNS: { id: CardColumn; label: string }[] = [
  { id: "BACKLOG", label: "Backlog" },
  { id: "TODO", label: "To do" },
  { id: "IN_PROGRESS", label: "In progress" },
  { id: "IN_REVIEW", label: "In review" },
  { id: "DONE", label: "Done" },
];

export function Board({ projectId, cards }: { projectId: string; cards: BoardCard[] }) {
  // Moves show instantly and are saved in the background.
  const [optimisticCards, applyMove] = useOptimistic(
    cards,
    (state, move: { id: string; column: CardColumn }) =>
      state.map((card) =>
        card.id === move.id ? { ...card, column: move.column, position: Infinity } : card,
      ),
  );
  const [, startTransition] = useTransition();
  const [dragOver, setDragOver] = useState<CardColumn | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  function move(id: string, column: CardColumn) {
    setError(null);
    setWarning(null);
    startTransition(async () => {
      applyMove({ id, column });
      try {
        const result = await moveCardAction(id, column);
        if (result.warning) setWarning(result.warning);
      } catch {
        setError("Couldn't move the card. Try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-300">{error}</p>}
      {warning && <p className="text-sm text-amber-200">{warning}</p>}
      {/* Five columns share the width on wide screens and scroll sideways on phones. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div className="grid grid-cols-[repeat(5,minmax(11rem,1fr))] gap-3">
          {COLUMNS.map((column) => {
            const columnCards = optimisticCards
              .filter((card) => card.column === column.id)
              .sort((a, b) => a.position - b.position);
            return (
              <section
                key={column.id}
                aria-label={column.label}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(column.id);
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(null);
                  const id = event.dataTransfer.getData("text/plain");
                  if (id) move(id, column.id);
                }}
                className={`glass flex min-w-0 flex-col gap-2 rounded-2xl p-2.5 transition-colors ${
                  dragOver === column.id ? "border-white/50 bg-white/15" : ""
                }`}
              >
                <h3 className="flex items-center justify-between px-1 text-sm font-semibold">
                  {column.label}
                  <span className="rounded-full bg-white/10 px-2 text-xs font-normal text-white/75">
                    {columnCards.length}
                  </span>
                </h3>

                {columnCards.map((card) => (
                  <CardItem key={card.id} card={card} onMove={move} />
                ))}
                {columnCards.length === 0 && (
                  <p className="rounded-xl border border-dashed border-white/20 p-3 text-center text-xs text-white/55">
                    Drop cards here
                  </p>
                )}

                {column.id === "BACKLOG" && <AddCardForm projectId={projectId} />}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CardItem({
  card,
  onMove,
}: {
  card: BoardCard;
  onMove: (id: string, column: CardColumn) => void;
}) {
  const [isDeleting, startDelete] = useTransition();
  const isTodo = card.issueNumber === null;

  return (
    <article
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", card.id);
        event.dataTransfer.effectAllowed = "move";
      }}
      className="glass-strong cursor-grab rounded-xl p-3 shadow-lg shadow-black/20 active:cursor-grabbing"
    >
      <p className="text-sm leading-snug">{card.title}</p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-white/70">
        {card.url ? (
          <a href={card.url} target="_blank" rel="noreferrer" className="hover:underline">
            #{card.issueNumber}
          </a>
        ) : (
          <span className="rounded-full border border-white/20 px-1.5">to-do</span>
        )}
        {card.prNumber !== null && (
          <a
            href={card.prUrl ?? undefined}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-full bg-purple-400/20 px-1.5 text-purple-200 hover:underline"
          >
            {card.prChecks && (
              <span
                aria-hidden
                title={CHECKS[card.prChecks].label}
                className={`size-1.5 rounded-full ${CHECKS[card.prChecks].dot}`}
              />
            )}
            PR #{card.prNumber}
            {card.prChecks && <span className="sr-only">, {CHECKS[card.prChecks].label}</span>}
          </a>
        )}
        {card.prReview && (
          <span className={`rounded-full px-1.5 ${REVIEWS[card.prReview].className}`}>
            {REVIEWS[card.prReview].label}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <label className="sr-only" htmlFor={`move-${card.id}`}>
          Move “{card.title}” to
        </label>
        <select
          id={`move-${card.id}`}
          value={card.column}
          onChange={(event) => onMove(card.id, event.target.value as CardColumn)}
          className="field rounded-md px-1 py-0.5 text-xs"
        >
          {COLUMNS.map((column) => (
            <option key={column.id} value={column.id}>
              {column.label}
            </option>
          ))}
        </select>
        {isTodo && (
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => startDelete(() => deleteCardAction(card.id))}
            className="text-xs text-white/60 hover:text-red-300 disabled:opacity-50"
          >
            Delete
          </button>
        )}
      </div>
    </article>
  );
}

function AddCardForm({ projectId }: { projectId: string }) {
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!title.trim()) return;
        startTransition(async () => {
          await addCardAction(projectId, title);
          setTitle("");
        });
      }}
      className="flex gap-1.5"
    >
      <label className="sr-only" htmlFor="new-card">
        New to-do
      </label>
      <input
        id="new-card"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Add a to-do…"
        maxLength={200}
        size={1}
        className="field min-w-0 flex-1 rounded-lg px-2 py-1 text-sm"
      />
      <button
        type="submit"
        disabled={isPending || !title.trim()}
        className="btn-primary h-8 px-3 text-sm"
      >
        Add
      </button>
    </form>
  );
}
