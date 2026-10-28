"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importIssuesAction } from "./actions";

// Re-fetches the page now and then, so webhook changes show up without a reload.
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return null;
}

export function ImportIssuesButton({ projectId }: { projectId: string }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      {message && <span className="text-sm text-foreground/60">{message}</span>}
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setMessage(null);
            try {
              const count = await importIssuesAction(projectId);
              setMessage(count === 0 ? "No open issues found" : `Synced ${count} open issue${count === 1 ? "" : "s"}`);
            } catch {
              setMessage("Couldn't reach GitHub. Try again.");
            }
          })
        }
        className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm font-medium hover:bg-foreground/5 disabled:opacity-50"
      >
        {isPending ? "Importing…" : "Import open issues"}
      </button>
    </div>
  );
}
