"use client";

import { useState, useTransition } from "react";
import { FolderPanel, paperFor } from "@/components/folder-card";
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
    <FolderPanel paper={paperFor(day)}>
      <div className="flex flex-col gap-3">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-serif text-2xl italic">{label}</h3>
          <span className="font-mono text-xs text-neutral-500">
            {edited ? "edited by you" : "ai draft"}
          </span>
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
              className="w-full rounded-2xl border border-neutral-300 bg-white/70 p-3 text-sm leading-relaxed text-neutral-900 placeholder:text-neutral-400"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => saveEntryAction(id, draft), () => setIsEditing(false))}
                className="btn-primary h-9 px-5 text-sm"
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
                className={outlineButton}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">{text}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setDraft(text);
                  setIsEditing(true);
                }}
                className={darkButton}
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
                className={outlineButton}
              >
                {isPending ? "Writing…" : "Regenerate"}
              </button>
            </div>
          </>
        )}

        {result && (
          <p role="status" className={`text-sm ${result.error ? "text-red-600" : "text-neutral-600"}`}>
            {result.error ?? result.message}
          </p>
        )}
      </div>
    </FolderPanel>
  );
}

// Buttons for the milky-white folder pocket.
const darkButton =
  "inline-flex h-9 items-center rounded-full bg-neutral-900 px-5 text-sm font-medium text-white shadow-md shadow-black/20 hover:bg-neutral-800";
const outlineButton =
  "inline-flex h-9 items-center rounded-full border border-neutral-300 px-5 text-sm font-medium text-neutral-900 hover:bg-neutral-900/5 disabled:opacity-50";

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
        className="btn-primary h-10 px-5 text-sm"
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
