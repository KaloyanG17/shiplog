"use client";

import { useOptimistic, useState, useTransition } from "react";
import type { CardColumn } from "@/generated/prisma/enums";
import { addCardAction, deleteCardAction, moveCardAction } from "./actions";

export type BoardCard = {
  id: string;
  title: string;
  column: CardColumn;
  position: number;
  issueNumber: number | null;
  url: string | null;
  prNumber: number | null;
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

  function move(id: string, column: CardColumn) {
    setError(null);
    startTransition(async () => {
      applyMove({ id, column });
      try {
        await moveCardAction(id, column);
      } catch {
        setError("Couldn't move the card. Try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
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
                className={`flex min-w-0 flex-col gap-2 rounded-lg border p-2 transition-colors ${
                  dragOver === column.id
                    ? "border-foreground/40 bg-foreground/10"
                    : "border-foreground/10 bg-foreground/[0.03]"
                }`}
              >
                <h3 className="flex items-center justify-between px-1 text-sm font-semibold">
                  {column.label}
                  <span className="text-xs font-normal text-foreground/50">{columnCards.length}</span>
                </h3>

                {columnCards.map((card) => (
                  <CardItem key={card.id} card={card} onMove={move} />
                ))}
                {columnCards.length === 0 && (
                  <p className="rounded-md border border-dashed border-foreground/15 p-3 text-center text-xs text-foreground/40">
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
      className="cursor-grab rounded-md border border-foreground/10 bg-background p-2.5 shadow-sm active:cursor-grabbing"
    >
      <p className="text-sm leading-snug">{card.title}</p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-foreground/60">
        {card.url ? (
          <a href={card.url} target="_blank" rel="noreferrer" className="hover:underline">
            #{card.issueNumber}
          </a>
        ) : (
          <span className="rounded border border-foreground/15 px-1">to-do</span>
        )}
        {card.prNumber !== null && (
          <span className="rounded bg-purple-600/15 px-1 text-purple-700 dark:text-purple-300">
            PR #{card.prNumber}
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
          className="rounded border border-foreground/15 bg-background px-1 py-0.5 text-xs"
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
            className="text-xs text-foreground/50 hover:text-red-600 disabled:opacity-50"
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
        className="min-w-0 flex-1 rounded border border-foreground/15 bg-background px-2 py-1 text-sm"
      />
      <button
        type="submit"
        disabled={isPending || !title.trim()}
        className="rounded bg-foreground px-2 py-1 text-sm text-background disabled:opacity-40"
      >
        Add
      </button>
    </form>
  );
}
