import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { currentVoterHash } from "@/lib/voter";
import { VoteButton } from "./vote-button";

const COLUMN_LABEL = {
  BACKLOG: "Planned",
  TODO: "Up next",
  IN_PROGRESS: "In progress",
  IN_REVIEW: "In review",
  DONE: "Done",
} as const;

function findPublicProject(slug: string) {
  return db.project.findFirst({
    where: { slug, isPublic: true },
    include: { repos: { select: { fullName: true, htmlUrl: true, isPrivate: true } } },
  });
}

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = await findPublicProject(slug);
  if (!project) return { title: "Project not found · Shiplog" };
  const description = project.description ?? `Roadmap and changelog for ${project.name}, built with Shiplog.`;
  return {
    title: `${project.name} · roadmap and changelog`,
    description,
    openGraph: { title: `${project.name} on Shiplog`, description },
  };
}

// Public, signed-out page for a project: an upvotable roadmap of open cards
// and a changelog of merged PRs and manual entries.
export default function PublicProjectPage({ params }: PageProps<"/p/[slug]">) {
  return (
    <Suspense fallback={<p className="text-white/70">Loading…</p>}>
      <PublicProject params={params} />
    </Suspense>
  );
}

async function PublicProject({ params }: Pick<PageProps<"/p/[slug]">, "params">) {
  const { slug } = await params;
  const project = await findPublicProject(slug);
  if (!project) notFound();

  const [cards, changelog, voterHash] = await Promise.all([
    db.card.findMany({
      where: { projectId: project.id, column: { not: "DONE" } },
      select: { id: true, title: true, column: true, _count: { select: { votes: true } } },
    }),
    db.changelogItem.findMany({
      where: { projectId: project.id },
      orderBy: { publishedAt: "desc" },
      take: 30,
    }),
    currentVoterHash(),
  ]);
  const myVotes = voterHash
    ? new Set(
        (
          await db.roadmapVote.findMany({
            where: { voterHash, cardId: { in: cards.map((card) => card.id) } },
            select: { cardId: true },
          })
        ).map((vote) => vote.cardId),
      )
    : new Set<string>();

  // Most-wanted first, then by how far along they are.
  const order = Object.keys(COLUMN_LABEL);
  const roadmap = [...cards].sort(
    (a, b) => b._count.votes - a._count.votes || order.indexOf(b.column) - order.indexOf(a.column),
  );
  const publicRepos = project.repos.filter((repo) => !repo.isPrivate);

  return (
    <div className="flex flex-col gap-10 text-white">
      <header className="flex flex-col gap-3">
        <Link href="/explore" className="w-fit text-sm text-white/75 hover:text-white hover:underline">
          ← All public projects
        </Link>
        <h1 className="flex flex-wrap items-baseline gap-x-3 leading-none tracking-tight">
          <span className="text-5xl font-black sm:text-6xl">{project.name}</span>
          <span className="font-serif text-3xl italic sm:text-4xl">roadmap &amp; changelog</span>
        </h1>
        {project.description && <p className="max-w-2xl text-lg text-white/85">{project.description}</p>}
        {publicRepos.map((repo) => (
          <a key={repo.fullName} href={repo.htmlUrl} className="w-fit font-mono text-sm text-white/75 hover:text-white hover:underline">
            {repo.fullName} ↗
          </a>
        ))}
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-labelledby="roadmap-heading" className="flex flex-col gap-3">
          <h2 id="roadmap-heading" className="font-serif text-3xl italic">
            Roadmap
          </h2>
          <p className="text-sm text-white/70">Upvote what you&apos;d like to see next.</p>
          {roadmap.length === 0 ? (
            <p className="glass rounded-2xl p-4 text-sm text-white/80">Nothing planned right now.</p>
          ) : (
            <ol className="flex flex-col gap-2">
              {roadmap.map((card) => (
                <li key={card.id} className="glass flex items-center gap-4 rounded-2xl p-3">
                  <VoteButton cardId={card.id} votes={card._count.votes} voted={myVotes.has(card.id)} title={card.title} />
                  <div className="min-w-0">
                    <p className="font-medium">{card.title}</p>
                    <p className="font-mono text-xs text-white/60">{COLUMN_LABEL[card.column]}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section aria-labelledby="changelog-heading" className="flex flex-col gap-3">
          <h2 id="changelog-heading" className="font-serif text-3xl italic">
            Changelog
          </h2>
          <p className="text-sm text-white/70">What&apos;s shipped, newest first.</p>
          {changelog.length === 0 ? (
            <p className="glass rounded-2xl p-4 text-sm text-white/80">Nothing shipped yet. Check back soon.</p>
          ) : (
            <ol className="glass flex flex-col divide-y divide-white/10 rounded-2xl">
              {changelog.map((item) => (
                <li key={item.id} className="flex flex-col gap-0.5 px-4 py-3">
                  <time dateTime={item.publishedAt.toISOString()} className="font-mono text-xs text-white/60">
                    {item.publishedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    {item.source === "PULL_REQUEST" && " · merged PR"}
                  </time>
                  {item.url ? (
                    <a href={item.url} className="font-medium hover:underline">
                      {item.title}
                    </a>
                  ) : (
                    <p className="font-medium">{item.title}</p>
                  )}
                  {item.body && <p className="text-sm text-white/80">{item.body}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
