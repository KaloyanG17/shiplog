import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/auth";
import { summarizeEvent } from "@/lib/activity";
import { db } from "@/lib/db";
import { Board, type BoardCard } from "./board";
import { AutoRefresh, ImportIssuesButton } from "./client-parts";

export default function ProjectPage({ params }: PageProps<"/projects/[id]">) {
  return (
    <Suspense fallback={<p className="text-foreground/60">Loading project…</p>}>
      <ProjectView params={params} />
    </Suspense>
  );
}

async function ProjectView({ params }: Pick<PageProps<"/projects/[id]">, "params">) {
  const session = await getSession();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const project = await db.project.findFirst({
    where: { id, userId: session.user.id },
    include: { repos: true, cards: true },
  });
  if (!project) notFound();

  const events = await db.githubEvent.findMany({
    where: { repoId: { in: project.repos.map((repo) => repo.id) } },
    orderBy: { occurredAt: "desc" },
    take: 20,
  });

  const cards: BoardCard[] = project.cards.map((card) => ({
    id: card.id,
    title: card.title,
    column: card.column,
    position: card.position,
    issueNumber: card.githubIssueNumber,
    url: card.githubUrl,
    prNumber: card.linkedPrNumber,
  }));
  const done = cards.filter((card) => card.column === "DONE").length;

  return (
    <div className="flex flex-col gap-8">
      <AutoRefresh />

      <header className="flex flex-col gap-3">
        <Link href="/dashboard" className="text-sm text-foreground/60 hover:text-foreground">
          ← All projects
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="mt-1 max-w-2xl text-foreground/70">{project.description}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-foreground/60">
              {project.repos.map((repo) => (
                <a key={repo.id} href={repo.htmlUrl} className="hover:underline">
                  {repo.fullName}
                  {repo.isPrivate && " (private)"}
                </a>
              ))}
              <span>
                {cards.length} card{cards.length === 1 ? "" : "s"} · {done} done
              </span>
            </div>
          </div>
          {project.repos.length > 0 && <ImportIssuesButton projectId={project.id} />}
        </div>
      </header>

      <section aria-labelledby="board-heading" className="flex flex-col gap-3">
        <h2 id="board-heading" className="sr-only">
          Board
        </h2>
        {cards.length === 0 && (
          <p className="text-sm text-foreground/60">
            No cards yet. Import this repo&apos;s open issues, add a private to-do, or open an issue
            on GitHub: it appears here automatically.
          </p>
        )}
        <Board projectId={project.id} cards={cards} />
      </section>

      <section aria-labelledby="activity-heading" className="flex flex-col gap-3">
        <h2 id="activity-heading" className="font-semibold">
          Recent activity
        </h2>
        {events.length === 0 ? (
          <p className="text-sm text-foreground/60">
            Nothing yet. Pushes, issues and pull requests on GitHub show up here.
          </p>
        ) : (
          <ol className="flex flex-col divide-y divide-foreground/10 rounded-lg border border-foreground/10">
            {events.map((event) => {
              const summary = summarizeEvent(event);
              return (
                <li key={event.id} className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2 text-sm">
                  {summary.url ? (
                    <a href={summary.url} className="hover:underline">
                      {summary.text}
                    </a>
                  ) : (
                    <span>{summary.text}</span>
                  )}
                  <time
                    dateTime={event.occurredAt.toISOString()}
                    className="text-xs text-foreground/50"
                  >
                    {event.occurredAt.toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Europe/Sofia",
                    })}
                  </time>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
