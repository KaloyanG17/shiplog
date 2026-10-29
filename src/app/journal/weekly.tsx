"use client";

import { useState, useTransition } from "react";
import { FolderPanel } from "@/components/folder-card";
import { generateWeeklyAction, type ActionResult } from "./actions";

const darkButton =
  "inline-flex h-9 items-center rounded-full bg-neutral-900 px-5 text-sm font-medium text-white shadow-md shadow-black/20 hover:bg-neutral-800 disabled:opacity-50";
const outlineButton =
  "inline-flex h-9 items-center rounded-full border border-neutral-300 px-5 text-sm font-medium text-neutral-900 hover:bg-neutral-900/5 disabled:opacity-50";

// "This week": an AI summary of the week's journal plus three CV bullets.
export function WeeklySummary({
  weekLabel,
  summary,
  bullets,
  entryCount,
}: {
  weekLabel: string;
  summary: string | null;
  bullets: string[];
  entryCount: number;
}) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function generate() {
    setResult(null);
    startTransition(async () => setResult(await generateWeeklyAction()));
  }

  async function copyBullets() {
    await navigator.clipboard.writeText(bullets.map((bullet) => `• ${bullet}`).join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <FolderPanel paper={3}>
      <div className="flex flex-col gap-3">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-serif text-2xl italic">Week of {weekLabel}</h3>
          <span className="font-mono text-xs text-neutral-500">
            {entryCount} journal entr{entryCount === 1 ? "y" : "ies"}
          </span>
        </header>

        {summary ? (
          <>
            <p className="text-sm leading-relaxed text-neutral-800">{summary}</p>
            <div>
              <p className="mb-1 text-xs font-semibold tracking-wide text-neutral-500 uppercase">For your CV</p>
              <ul className="flex flex-col gap-1.5 text-sm text-neutral-900">
                {bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span aria-hidden className="text-orange-500">
                      ▸
                    </span>
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={copyBullets} className={darkButton}>
                {copied ? "Copied" : "Copy bullets"}
              </button>
              <button type="button" onClick={generate} disabled={isPending} className={outlineButton}>
                {isPending ? "Summarising…" : "Regenerate"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-neutral-700">
              Turn this week&apos;s journal into a short summary and three bullet points ready for your CV
              or LinkedIn.
            </p>
            <button type="button" onClick={generate} disabled={isPending || entryCount === 0} className="btn-primary h-10 w-fit px-5 text-sm">
              {isPending ? "Summarising…" : "Summarise my week"}
            </button>
          </>
        )}

        {result?.error && (
          <p role="status" className="text-sm text-red-600">
            {result.error}
          </p>
        )}
      </div>
    </FolderPanel>
  );
}
