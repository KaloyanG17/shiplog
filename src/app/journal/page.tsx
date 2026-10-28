import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/auth";
import { db } from "@/lib/db";
import { getDayEvents, JOURNAL_TIME_ZONE, localDay } from "@/lib/journal";
import { GenerateButton, JournalEntry } from "./entry";

export default function JournalPage() {
  return (
    <Suspense fallback={<p className="text-foreground/60">Loading journal…</p>}>
      <Journal />
    </Suspense>
  );
}

function formatDay(date: Date) {
  return date.toLocaleDateString("en-GB", {
    timeZone: "UTC", // JournalEntry.date is a plain calendar date
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

async function Journal() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const today = localDay(new Date());
  const [entries, todayEvents] = await Promise.all([
    db.journalEntry.findMany({
      where: { userId: session.user.id },
      orderBy: { date: "desc" },
      take: 30,
    }),
    getDayEvents(session.user.id, today),
  ]);
  const todayEntry = entries.find((entry) => entry.date.toISOString().slice(0, 10) === today);
  const pastEntries = entries.filter((entry) => entry !== todayEntry);

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-bold">Journal</h1>
        <p className="mt-1 max-w-2xl text-foreground/70">
          Gemini drafts an entry from each day&apos;s GitHub activity. Edit it to add what GitHub
          can&apos;t see: what you learned, what got you stuck.
        </p>
      </header>

      <section aria-labelledby="today-heading" className="flex flex-col gap-3">
        <h2 id="today-heading" className="font-semibold">
          Today
          <span className="ml-2 text-sm font-normal text-foreground/50">
            {todayEvents.length} GitHub event{todayEvents.length === 1 ? "" : "s"} so far
          </span>
        </h2>
        {todayEntry ? (
          <JournalEntry
            key={`${todayEntry.id}-${todayEntry.updatedAt.getTime()}`}
            id={todayEntry.id}
            day={today}
            label={formatDay(todayEntry.date)}
            text={todayEntry.content ?? todayEntry.aiDraft ?? ""}
            edited={todayEntry.content !== null}
          />
        ) : (
          <div className="flex flex-col gap-3 rounded-lg border border-dashed border-foreground/20 p-4">
            <p className="text-sm text-foreground/70">
              {todayEvents.length === 0
                ? "Nothing on GitHub yet today. Push, open an issue or a PR, and there will be something to write about."
                : "No entry yet. One is written automatically each evening, or write it now."}
            </p>
            <GenerateButton day={today} disabled={todayEvents.length === 0} />
          </div>
        )}
      </section>

      <section aria-labelledby="past-heading" className="flex flex-col gap-3">
        <h2 id="past-heading" className="font-semibold">
          Earlier
        </h2>
        {pastEntries.length === 0 ? (
          <p className="text-sm text-foreground/60">Past entries will appear here.</p>
        ) : (
          pastEntries.map((entry) => (
            <JournalEntry
              key={`${entry.id}-${entry.updatedAt.getTime()}`}
              id={entry.id}
              day={entry.date.toISOString().slice(0, 10)}
              label={formatDay(entry.date)}
              text={entry.content ?? entry.aiDraft ?? ""}
              edited={entry.content !== null}
            />
          ))
        )}
      </section>

      <p className="text-xs text-foreground/40">Days follow the {JOURNAL_TIME_ZONE} time zone.</p>
    </div>
  );
}
