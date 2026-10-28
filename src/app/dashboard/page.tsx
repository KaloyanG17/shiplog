import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/auth";
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

  const { connected, error } = await searchParams;
  const [installations, projects] = await Promise.all([
    db.installation.findMany({ where: { userId: session.user.id } }),
    db.project.findMany({
      where: { userId: session.user.id },
      include: { repos: true, _count: { select: { cards: true } } },
      orderBy: { name: "asc" },
    }),
  ]);
  const installation = installations[0];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Hi {session.user.name ?? "there"} 👋</h1>

      {connected && (
        <p className="rounded-md border border-green-600/30 bg-green-600/10 p-3 text-sm">
          GitHub connected. Your repos are synced below.
        </p>
      )}
      {typeof error === "string" && (
        <p className="rounded-md border border-red-600/30 bg-red-600/10 p-3 text-sm">{error}</p>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Your projects</h2>
          <div className="flex items-center gap-3">
            {installation ? (
              <>
                <form action={syncReposAction}>
                  <button type="submit" className="text-sm text-foreground/70 hover:text-foreground">
                    Sync repos
                  </button>
                </form>
                <a
                  href={getManageInstallationUrl(installation.githubInstallId)}
                  className="rounded-md border border-foreground/20 px-3 py-1.5 text-sm font-medium hover:bg-foreground/5"
                >
                  Add or remove repos
                </a>
              </>
            ) : (
              <a
                href={getInstallUrl()}
                className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90"
              >
                Connect GitHub repos
              </a>
            )}
          </div>
        </div>

        {projects.length === 0 ? (
          <p className="text-sm text-foreground/60">
            No projects yet. Connect GitHub and pick the repos you want Shiplog to track. Each
            repo becomes a project.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {projects.map((project) => (
              <li
                key={project.id}
                className="relative rounded-md border border-foreground/10 p-4 transition-colors hover:border-foreground/30 hover:bg-foreground/[0.03]"
              >
                <div className="flex items-baseline justify-between gap-2">
                  {/* Stretched link: the whole tile opens the project. */}
                  <Link
                    href={`/projects/${project.id}`}
                    className="font-medium after:absolute after:inset-0 after:rounded-md"
                  >
                    {project.name}
                  </Link>
                  <span className="shrink-0 text-xs text-foreground/50">
                    {project._count.cards} card{project._count.cards === 1 ? "" : "s"}
                  </span>
                </div>
                {project.description && (
                  <p className="mt-1 text-sm text-foreground/70">{project.description}</p>
                )}
                <ul className="mt-2 flex flex-col gap-1">
                  {project.repos.map((repo) => (
                    <li key={repo.id} className="text-sm text-foreground/60">
                      <a href={repo.htmlUrl} className="relative z-10 hover:underline">
                        {repo.fullName}
                      </a>
                      {repo.isPrivate && (
                        <span className="ml-2 rounded border border-foreground/20 px-1 text-xs">
                          private
                        </span>
                      )}
                    </li>
                  ))}
                  {project.repos.length === 0 && (
                    <li className="text-sm text-foreground/50">No repo connected</li>
                  )}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
