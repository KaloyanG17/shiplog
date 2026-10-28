import { RequestError } from "@octokit/request-error";
import { db } from "@/lib/db";
import { getGithubApp } from "@/lib/github";

export class InstallationError extends Error {}

// Links a GitHub App installation to a Shiplog user, then syncs its repos.
//
// The installation_id comes from a query string, so anyone could send any ID.
// The real check is that the installation's GitHub account is the signed-in
// user's own GitHub account. Org installations aren't supported yet.
export async function connectInstallation(userId: string, githubInstallId: number) {
  const githubAccount = await db.account.findFirst({
    where: { userId, provider: "github" },
    select: { providerAccountId: true },
  });
  if (!githubAccount) throw new InstallationError("No GitHub account linked to this user.");

  const { data } = await getGithubApp().octokit.request(
    "GET /app/installations/{installation_id}",
    { installation_id: githubInstallId },
  );
  const account = data.account;
  if (!account || !("login" in account)) {
    throw new InstallationError("Installations on enterprises aren't supported.");
  }
  if (String(account.id) !== githubAccount.providerAccountId) {
    throw new InstallationError(
      "Shiplog can only be installed on your personal GitHub account for now.",
    );
  }

  const installation = await db.installation.upsert({
    where: { githubInstallId: BigInt(githubInstallId) },
    create: {
      githubInstallId: BigInt(githubInstallId),
      accountId: BigInt(account.id),
      accountLogin: account.login,
      userId,
    },
    update: { accountLogin: account.login, userId },
  });

  await syncRepos(installation);
}

// Re-syncs every installation the user has; drops ones uninstalled on GitHub.
export async function syncAllInstallations(userId: string) {
  const installations = await db.installation.findMany({ where: { userId } });
  for (const installation of installations) {
    try {
      await syncRepos(installation);
    } catch (error) {
      if (error instanceof RequestError && error.status === 404) {
        await db.installation.delete({ where: { id: installation.id } });
      } else {
        throw error;
      }
    }
  }
}

type InstallationRef = { id: string; githubInstallId: bigint; userId: string };

// The repo fields shared by the REST API and installation webhook payloads.
type RepoInfo = {
  id: number | bigint;
  name: string;
  full_name: string;
  private: boolean;
  description?: string | null;
};

// Mirrors the installation's full repo list into the database.
async function syncRepos(installation: InstallationRef) {
  const octokit = await getGithubApp().getInstallationOctokit(Number(installation.githubInstallId));
  const repos = await octokit.paginate("GET /installation/repositories", { per_page: 100 });

  await addRepos(installation, repos);
  await db.repo.deleteMany({
    where: {
      installationId: installation.id,
      githubRepoId: { notIn: repos.map((repo) => BigInt(repo.id)) },
    },
  });
}

// Saves repos and gives each new one its own project (one board per repo in v1).
export async function addRepos(installation: InstallationRef, repos: RepoInfo[]) {
  for (const repo of repos) {
    const fields = {
      name: repo.name,
      fullName: repo.full_name,
      isPrivate: repo.private,
      htmlUrl: `https://github.com/${repo.full_name}`,
      installationId: installation.id,
    };
    const saved = await db.repo.upsert({
      where: { githubRepoId: BigInt(repo.id) },
      create: { githubRepoId: BigInt(repo.id), ...fields },
      update: fields,
    });

    if (!saved.projectId) {
      const project = await db.project.create({
        data: {
          name: repo.name,
          slug: await uniqueSlug(repo.name),
          description: repo.description,
          userId: installation.userId,
        },
      });
      // The setup redirect and the installation_repositories webhook can sync
      // the same repo at once. Only link if no one else did; otherwise drop ours.
      const linked = await db.repo.updateMany({
        where: { id: saved.id, projectId: null },
        data: { projectId: project.id },
      });
      if (linked.count === 0) await db.project.delete({ where: { id: project.id } });
    }
  }
}

// Deletes repos removed from the installation. Their projects are kept.
export async function removeRepos(installationId: string, githubRepoIds: (number | bigint)[]) {
  await db.repo.deleteMany({
    where: { installationId, githubRepoId: { in: githubRepoIds.map((id) => BigInt(id)) } },
  });
}

async function uniqueSlug(name: string) {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "project";
  let slug = base;
  for (let n = 2; await db.project.findUnique({ where: { slug } }); n++) {
    slug = `${base}-${n}`;
  }
  return slug;
}
