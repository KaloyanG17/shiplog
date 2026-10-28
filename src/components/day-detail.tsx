import Link from "next/link";
import { FolderPanel, paperFor } from "@/components/folder-card";
import { summarizeEvent } from "@/lib/activity";
import { db } from "@/lib/db";
import { dayRange, dayToDate, localDay } from "@/lib/journal";

const longDate = (day: string) =>
  dayToDate(day).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

// What happened on one day: the projects worked on (from Shiplog's stored
// GitHub events, private repos included since this stays on your dashboard)
// and that day's journal entry. Render inside <Suspense>.
export async function DayDetail({ userId, day, closeHref }: { userId: string; day: string; closeHref: string }) {
  const { start, end } = dayRange(day);
  const [events, entry] = await Promise.all([
    db.githubEvent.findMany({
      where: { occurredAt: { gte: start, lt: end }, repo: { installation: { userId } } },
      include: { repo: { select: { fullName: true, project: { select: { id: true, name: true } } } } },
      orderBy: { occurredAt: "asc" },
    }),
    db.journalEntry.findUnique({ where: { userId_date: { userId, date: dayToDate(day) } } }),
  ]);

  // Group the day's events by project (or by repo if it has no project).
  const groups = new Map<string, { name: string; href?: string; lines: string[] }>();
  for (const event of events) {
    const project = event.repo.project;
    const key = project?.id ?? event.repo.fullName;
    const group = groups.get(key) ?? {
      name: project?.name ?? event.repo.fullName,
      href: project ? `/projects/${project.id}` : undefined,
      lines: [],
    };
    group.lines.push(summarizeEvent(event).text);
    groups.set(key, group);
  }

  const journalText = entry?.content ?? entry?.aiDraft;
  const isToday = day === localDay(new Date());

  return (
    <section aria-labelledby="day-title" className="glass flex flex-col gap-5 rounded-3xl p-5">
      <header className="flex items-baseline justify-between gap-3">
        <h2 id="day-title" className="font-serif text-2xl italic">
          {longDate(day)}
        </h2>
        <Link href={closeHref} scroll={false} className="btn-ghost h-8 px-3 text-xs" aria-label="Close day details">
          Close
        </Link>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-white/80">Projects you worked on</h3>
          {groups.size === 0 ? (
            <p className="text-sm text-white/70">
              Shiplog has no activity recorded for this day. It only sees events from repos it
              tracks, starting from when you connected them.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {[...groups.values()].map((group) => (
                <li key={group.name} className="rounded-2xl border border-white/15 bg-black/25 p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    {group.href ? (
                      <Link href={group.href} className="font-semibold hover:underline">
                        {group.name}
                      </Link>
                    ) : (
                      <span className="font-semibold">{group.name}</span>
                    )}
                    <span className="font-mono text-xs text-white/60">
                      {group.lines.length} event{group.lines.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ul className="mt-1.5 flex flex-col gap-0.5 text-sm text-white/80">
                    {group.lines.slice(0, 5).map((line, i) => (
                      <li key={i} className="truncate">
                        {line}
                      </li>
                    ))}
                    {group.lines.length > 5 && (
                      <li className="text-white/60">and {group.lines.length - 5} more</li>
                    )}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-white/80">Journal</h3>
          {journalText ? (
            <FolderPanel paper={paperFor(day)}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-800">{journalText}</p>
              <Link
                href="/journal"
                className="mt-3 inline-flex h-9 items-center rounded-full bg-neutral-900 px-5 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Open journal
              </Link>
            </FolderPanel>
          ) : (
            <p className="text-sm text-white/70">
              No journal entry for this day.{" "}
              {isToday && (
                <Link href="/journal" className="underline hover:text-white">
                  Write today&apos;s entry
                </Link>
              )}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
