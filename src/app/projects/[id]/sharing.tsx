"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { addChangelogAction, deleteChangelogAction, setPublicAction } from "./actions";

// "Public page" switch for the project owner, with a link once it's on.
export function PublicToggle({
  projectId,
  slug,
  isPublic,
  hasPrivateRepo,
}: {
  projectId: string;
  slug: string;
  isPublic: boolean;
  hasPrivateRepo: boolean;
}) {
  const [on, setOn] = useOptimistic(isPublic);
  const [, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3">
        {on && (
          <Link href={`/p/${slug}`} className="text-sm text-white/80 underline-offset-4 hover:text-white hover:underline">
            View public page ↗
          </Link>
        )}
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={() =>
            startTransition(async () => {
              setOn(!on);
              await setPublicAction(projectId, !on);
            })
          }
          className="glass flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm"
        >
          <span
            aria-hidden
            className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors ${on ? "bg-gradient-to-r from-cyan-500 to-orange-500" : "bg-white/20"}`}
          >
            <span className={`size-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : ""}`} />
          </span>
          Public page
        </button>
      </div>
      {hasPrivateRepo && (
        <p className="text-xs text-white/60">The repo is private; its name and links stay hidden on the public page.</p>
      )}
    </div>
  );
}

type Item = { id: string; title: string; body: string | null; url: string | null; source: string; publishedAt: string };

// The project's changelog for its owner: merged PRs arrive automatically,
// and manual entries can be added or removed here.
export function ChangelogEditor({ projectId, items }: { projectId: string; items: Item[] }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim()) return;
          startTransition(async () => {
            await addChangelogAction(projectId, { title, body });
            setTitle("");
            setBody("");
          });
        }}
        className="glass flex flex-col gap-2 rounded-2xl p-3 sm:flex-row sm:items-start"
      >
        <label className="sr-only" htmlFor="changelog-title">
          What shipped?
        </label>
        <input
          id="changelog-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="What shipped?"
          maxLength={200}
          className="field min-w-0 flex-1 rounded-xl px-3 py-2 text-sm"
        />
        <label className="sr-only" htmlFor="changelog-body">
          Details (optional)
        </label>
        <input
          id="changelog-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Details (optional)"
          maxLength={2000}
          className="field min-w-0 flex-1 rounded-xl px-3 py-2 text-sm"
        />
        <button type="submit" disabled={isPending || !title.trim()} className="btn-primary h-9 px-5 text-sm">
          Add
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-white/70">No entries yet. Merged pull requests appear here automatically.</p>
      ) : (
        <ol className="glass flex flex-col divide-y divide-white/10 rounded-2xl">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="font-mono text-xs text-white/60">
                  {new Date(item.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  {item.source === "PULL_REQUEST" ? " · merged PR" : " · added by you"}
                </p>
                <p className="font-medium">{item.title}</p>
                {item.body && <p className="text-white/75">{item.body}</p>}
              </div>
              <button
                type="button"
                onClick={() => startTransition(() => deleteChangelogAction(item.id))}
                className="shrink-0 text-xs text-white/60 hover:text-red-300"
              >
                Remove
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
