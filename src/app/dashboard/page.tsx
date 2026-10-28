import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/auth";
import { FolderAction, FolderCard, paperFor } from "@/components/folder-card";
import { db } from "@/lib/db";
import { getInstallUrl, getManageInstallationUrl } from "@/lib/github";
import { syncReposAction } from "./actions";

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <Suspense fallback={<p className="text-foreground/60">Loading…</p>}>
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({ searchParams }: Pick<PageProps<"/dashboard">, "searchParams">) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const { connected, error, sort: sortParam } = await searchParams;
  const sort = parseSort(sortParam);
  const userId = session.user.id;
  const [installations, unsortedProjects, latestEvents] = await Promise.all([
    db.installation.findMany({ where: { userId } }),
    db.project.findMany({
      where: { userId },
      include: { repos: true, _count: { select: { cards: true } } },
    }),
    // Most recent GitHub event per repo, for "Recent activity".
    db.githubEvent.groupBy({
      by: ["repoId"],
      where: { repo: { installation: { userId } } },
      _max: { occurredAt: true },
    }),
  ]);
  const installation = installations[0];

  const lastEventByRepo = new Map(latestEvents.map((row) => [row.repoId, row._max.occurredAt]));
  const projects = sortProjects(
    unsortedProjects.map((project) => ({
      ...project,
      lastActivity: latestOf(project.repos.map((repo) => lastEventByRepo.get(repo.id))),
    })),
    sort,
  );
  const now = new Date();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-4xl font-black tracking-tight">
        Hi {session.user.name?.split(" ")[0] ?? "there"} 👋
      </h1>

      {connected && (
        <p className="glass rounded-2xl border-green-400/40 p-3 text-sm">
          GitHub connected. Your repos are synced below.
        </p>
      )}
      {typeof error === "string" && (
        <p className="glass rounded-2xl border-red-400/50 p-3 text-sm">{error}</p>
      )}

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="font-serif text-3xl italic">Your projects</h2>
            {projects.length > 1 && <SortControl current={sort} />}
          </div>
          <div className="flex items-center gap-3">
            {installation ? (
              <>
                <form action={syncReposAction}>
                  <button type="submit" className="text-sm text-white/75 hover:text-white">
                    Sync repos
                  </button>
                </form>
                <a
                  href={getManageInstallationUrl(installation.githubInstallId)}
                  className="btn-ghost h-9 px-4 text-sm"
                >
                  Add or remove repos
                </a>
              </>
            ) : (
              <a href={getInstallUrl()} className="btn-primary h-9 px-4 text-sm">
                Connect GitHub repos
              </a>
            )}
          </div>
        </div>

        {projects.length === 0 ? (
          <p className="glass rounded-2xl p-4 text-sm text-white/80">
            No projects yet. Connect GitHub and pick the repos you want Shiplog to track. Each
            repo becomes a project.
          </p>
        ) : (
          <ul className="grid gap-x-5 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const repo = project.repos[0];
              const meta = [
                `${project._count.cards} card${project._count.cards === 1 ? "" : "s"}`,
                project.lastActivity && `active ${relativeDay(project.lastActivity, now)}`,
                repo?.isPrivate && "private",
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <li key={project.id}>
                  <FolderCard
                    title={project.name}
                    meta={meta}
                    description={project.description}
                    href={`/projects/${project.id}`}
                    paper={paperFor(project.id)}
                    action={<FolderAction>→</FolderAction>}
                  >
                    {repo && (
                      <a
                        href={repo.htmlUrl}
                        className="relative z-10 mt-1 block truncate font-mono text-xs text-neutral-500 hover:text-neutral-900 hover:underline"
                      >
                        {repo.fullName}
                      </a>
                    )}
                  </FolderCard>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

const SORTS = {
  activity: "Recent activity",
  name: "Name",
  cards: "Most cards",
  newest: "Newest",
} as const;

type SortKey = keyof typeof SORTS;

function parseSort(value: string | string[] | undefined): SortKey {
  return typeof value === "string" && value in SORTS ? (value as SortKey) : "activity";
}

type SortableProject = {
  name: string;
  createdAt: Date;
  lastActivity: Date | null;
  _count: { cards: number };
};

const byName = (a: SortableProject, b: SortableProject) =>
  a.name.localeCompare(b.name, "en", { sensitivity: "base" });

// Every sort falls back to name, so the order is always stable.
function sortProjects<T extends SortableProject>(projects: T[], sort: SortKey) {
  const compare: Record<SortKey, (a: T, b: T) => number> = {
    // Projects with no activity yet go last.
    activity: (a, b) =>
      (b.lastActivity?.getTime() ?? -Infinity) - (a.lastActivity?.getTime() ?? -Infinity) ||
      byName(a, b),
    name: byName,
    cards: (a, b) => b._count.cards - a._count.cards || byName(a, b),
    newest: (a, b) => b.createdAt.getTime() - a.createdAt.getTime() || byName(a, b),
  };
  return [...projects].sort(compare[sort]);
}

function latestOf(dates: (Date | null | undefined)[]) {
  return dates.reduce<Date | null>((latest, date) => (date && (!latest || date > latest) ? date : latest), null);
}

const relativeFormat = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

// "today", "yesterday", "3 days ago", "2 weeks ago", "5 months ago"…
function relativeDay(date: Date, now: Date) {
  const days = Math.round((now.getTime() - date.getTime()) / 86_400_000);
  if (days < 7) return relativeFormat.format(-days, "day");
  if (days < 30) return relativeFormat.format(-Math.round(days / 7), "week");
  if (days < 365) return relativeFormat.format(-Math.round(days / 30), "month");
  return relativeFormat.format(-Math.round(days / 365), "year");
}

// Pill switcher. Each option is a link, so the choice lives in the URL.
function SortControl({ current }: { current: SortKey }) {
  return (
    <nav aria-label="Sort projects" className="glass flex flex-wrap gap-1 rounded-full p-1">
      {(Object.keys(SORTS) as SortKey[]).map((key) => (
        <Link
          key={key}
          href={key === "activity" ? "/dashboard" : `/dashboard?sort=${key}`}
          scroll={false}
          aria-current={key === current ? "true" : undefined}
          className={`rounded-full px-3 py-1 text-sm transition-colors ${
            key === current
              ? "bg-white font-medium text-neutral-900"
              : "text-white/80 hover:bg-white/10 hover:text-white"
          }`}
        >
          {SORTS[key]}
        </Link>
      ))}
    </nav>
  );
}
