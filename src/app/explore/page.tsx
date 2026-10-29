import { Suspense } from "react";
import type { Metadata } from "next";
import { FolderAction, FolderCard, paperFor } from "@/components/folder-card";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "Explore · Shiplog",
  description: "Projects being built in public with Shiplog: roadmaps you can upvote and changelogs of what shipped.",
};

// Public, signed-out directory of every project that has its public page on.
export default function ExplorePage() {
  return (
    <div className="flex flex-col gap-8 text-white">
      <header className="flex flex-col gap-3">
        <p className="w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">⛵ Built in public</p>
        <h1 className="flex flex-wrap items-baseline gap-x-3 leading-none tracking-tight">
          <span className="text-5xl font-black sm:text-6xl">Explore</span>
          <span className="font-serif text-3xl italic sm:text-4xl">what people are shipping</span>
        </h1>
        <p className="max-w-2xl text-lg text-white/85">
          Every project here has its public page switched on. Open one to see its roadmap, upvote what you want next and
          read what has shipped. No sign-in needed.
        </p>
      </header>
      <Suspense fallback={<ExploreSkeleton />}>
        <PublicProjects />
      </Suspense>
    </div>
  );
}

async function PublicProjects() {
  const projects = await db.project.findMany({
    where: { isPublic: true },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      updatedAt: true,
      user: { select: { name: true, image: true } },
      repos: { select: { fullName: true, htmlUrl: true, isPrivate: true }, take: 1 },
      changelog: { select: { publishedAt: true }, orderBy: { publishedAt: "desc" }, take: 1 },
      _count: { select: { changelog: true } },
    },
  });
  if (projects.length === 0) {
    return <p className="glass rounded-2xl p-4 text-sm text-white/80">No public projects yet. Be the first!</p>;
  }

  const openCounts = new Map(
    (
      await db.card.groupBy({
        by: ["projectId"],
        where: { projectId: { in: projects.map((project) => project.id) }, column: { not: "DONE" } },
        _count: { _all: true },
      })
    ).map((row) => [row.projectId, row._count._all]),
  );

  // Most recently shipped first; projects that haven't shipped yet go by last update.
  const lastShipped = (project: (typeof projects)[number]) =>
    (project.changelog[0]?.publishedAt ?? project.updatedAt).getTime();
  const sorted = [...projects].sort((a, b) => lastShipped(b) - lastShipped(a));

  return (
    <ul className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((project) => {
        const open = openCounts.get(project.id) ?? 0;
        const shipped = project._count.changelog;
        const repo = project.repos.find((r) => !r.isPrivate);
        return (
          <li key={project.id}>
            <FolderCard
              title={project.name}
              meta={`${open} on the roadmap · ${shipped} shipped`}
              description={project.description}
              href={`/p/${project.slug}`}
              paper={paperFor(project.id)}
              action={<FolderAction>→</FolderAction>}
            >
              <div className="mt-1.5 flex items-center gap-2 text-xs text-neutral-600">
                {project.user.image && (
                  // eslint-disable-next-line @next/next/no-img-element -- small avatar, no need for next/image config
                  <img src={project.user.image} alt="" className="size-5 rounded-full" />
                )}
                <span className="truncate">{project.user.name ?? "A Shiplog user"}</span>
                {repo && (
                  <a
                    href={repo.htmlUrl}
                    className="relative z-10 truncate font-mono text-neutral-500 hover:text-neutral-900 hover:underline"
                  >
                    {repo.fullName}
                  </a>
                )}
              </div>
            </FolderCard>
          </li>
        );
      })}
    </ul>
  );
}

function ExploreSkeleton() {
  return (
    <ul aria-hidden className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <li key={i} className="h-60 animate-pulse rounded-3xl bg-white/15" />
      ))}
    </ul>
  );
}
