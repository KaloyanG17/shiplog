import { Webhooks, type EmitterWebhookEvent } from "@octokit/webhooks";
import type { Prisma } from "@/generated/prisma/client";
import { handleIssueEvent, handlePullRequestEvent } from "@/lib/cards";
import { db } from "@/lib/db";
import { addRepos, removeRepos } from "@/lib/installations";

let webhooks: Webhooks | undefined;

export function getWebhooks() {
  if (!webhooks) {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) throw new Error("GITHUB_WEBHOOK_SECRET must be set in .env");
    webhooks = new Webhooks({ secret });
    registerHandlers(webhooks);
  }
  return webhooks;
}

function registerHandlers(webhooks: Webhooks) {
  // Activity in tracked repos: the raw material for the board and the journal.
  webhooks.on(["issues", "pull_request", "push"], storeEvent);

  // Keep the board in step with GitHub.
  webhooks.on("issues", async ({ payload }) => {
    const repo = await findRepo(payload.repository.id);
    if (repo) await handleIssueEvent(repo, payload.action, payload.issue);
  });
  webhooks.on("pull_request", async ({ payload }) => {
    const repo = await findRepo(payload.repository.id);
    if (!repo) return;
    await handlePullRequestEvent(repo, payload.action, payload.pull_request);

    // Merged PRs become changelog entries on the project's public page.
    const pr = payload.pull_request;
    if (payload.action === "closed" && pr.merged && repo.projectId) {
      const sourceId = `pr:${repo.id}:${pr.number}`;
      await db.changelogItem.upsert({
        where: { sourceId },
        create: {
          sourceId,
          source: "PULL_REQUEST",
          title: pr.title,
          url: pr.html_url,
          projectId: repo.projectId,
          publishedAt: pr.merged_at ? new Date(pr.merged_at) : new Date(),
        },
        update: { title: pr.title },
      });
    }
  });

  // Repos added to or removed from the installation on GitHub.
  webhooks.on("installation_repositories", async ({ payload }) => {
    const installation = await db.installation.findUnique({
      where: { githubInstallId: BigInt(payload.installation.id) },
    });
    // Not linked to a Shiplog user yet; the setup redirect will handle it.
    if (!installation) return;

    await addRepos(installation, payload.repositories_added);
    await removeRepos(
      installation.id,
      payload.repositories_removed.flatMap((repo) => (repo.id === undefined ? [] : [repo.id])),
    );
  });

  // App uninstalled on GitHub: drop the installation and its repos.
  webhooks.on("installation.deleted", async ({ payload }) => {
    await db.installation.deleteMany({
      where: { githubInstallId: BigInt(payload.installation.id) },
    });
  });
}

function findRepo(githubRepoId: number | bigint) {
  return db.repo.findUnique({
    where: { githubRepoId: BigInt(githubRepoId) },
    select: { id: true, projectId: true },
  });
}

async function storeEvent({
  id,
  name,
  payload,
}: EmitterWebhookEvent<"issues" | "pull_request" | "push">) {
  const repo = await findRepo(payload.repository.id);
  if (!repo) return;

  // GitHub may deliver the same event twice (retries, manual redelivery);
  // the unique deliveryId makes the second insert a no-op.
  await db.githubEvent.createMany({
    data: {
      deliveryId: id,
      type: name,
      action: "action" in payload ? payload.action : null,
      payload: payload as unknown as Prisma.InputJsonValue,
      repoId: repo.id,
      occurredAt: new Date(),
    },
    skipDuplicates: true,
  });
}
