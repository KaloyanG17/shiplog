"use client";

import { useState, useTransition } from "react";
import { generateEntryAction, saveEntryAction, type ActionResult } from "./actions";

type EntryProps = {
  id: string;
  day: string;
  label: string;
  text: string;
  edited: boolean;
};

export function JournalEntry({ id, day, label, text, edited }: EntryProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<ActionResult>, after?: () => void) {
    setResult(null);
    startTransition(async () => {
      const outcome = await action();
      setResult(outcome);
      if (!outcome.error) after?.();
    });
  }

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-foreground/10 p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">{label}</h3>
        <span className="text-xs text-foreground/50">{edited ? "Edited by you" : "AI draft"}</span>
      </header>

      {isEditing ? (
        <>
          <label className="sr-only" htmlFor={`entry-${id}`}>
            Journal entry for {label}
          </label>
          <textarea
            id={`entry-${id}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={Math.max(6, draft.split("\n").length + 1)}
            maxLength={10_000}
            className="w-full rounded-md border border-foreground/15 bg-background p-3 text-sm leading-relaxed"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => saveEntryAction(id, draft), () => setIsEditing(false))}
              className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setDraft(text);
                setIsEditing(false);
              }}
              className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm hover:bg-foreground/5"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(text);
                setIsEditing(true);
              }}
              className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm hover:bg-foreground/5"
            >
              Edit
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                if (edited && !window.confirm("Rewrite this entry? Your edits will be replaced.")) return;
                run(() => generateEntryAction(day));
              }}
              className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm hover:bg-foreground/5 disabled:opacity-50"
            >
              {isPending ? "Writing…" : "Regenerate"}
            </button>
          </div>
        </>
      )}

      {result && (
        <p role="status" className={`text-sm ${result.error ? "text-red-600" : "text-foreground/60"}`}>
          {result.error ?? result.message}
        </p>
      )}
    </article>
  );
}

export function GenerateButton({ day, disabled }: { day: string; disabled: boolean }) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={disabled || isPending}
        onClick={() =>
          startTransition(async () => {
            setResult(null);
            setResult(await generateEntryAction(day));
          })
        }
        className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background disabled:opacity-40"
      >
        {isPending ? "Writing…" : "Write today's entry"}
      </button>
      {result?.error && (
        <p role="status" className="text-sm text-red-600">
          {result.error}
        </p>
      )}
    </div>
  );
}
