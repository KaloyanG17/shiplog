import type { CardColumn } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { getGithubApp } from "@/lib/github";
import { pushCardStatus, refreshPrStatus } from "@/lib/github-sync";

type RepoRef = { id: string; projectId: string | null };

// The issue fields shared by the REST API and `issues` webhook payloads.
type IssueInfo = {
  id: number | bigint;
  number: number;
  title: string;
  body?: string | null;
  html_url: string;
  state?: string;
};

type PullRequestInfo = {
  number: number;
  title: string;
  body?: string | null;
  draft?: boolean;
  merged?: boolean | null;
};

export async function nextPosition(projectId: string, column: CardColumn) {
  const last = await db.card.aggregate({
    where: { projectId, column },
    _max: { position: true },
  });
  return (last._max.position ?? -1) + 1;
}

// Creates or updates the card mirroring a GitHub issue. `column` moves the
// card; without it an existing card stays where the user put it. Returns the
// card's id when an existing card changed column.
export async function upsertIssueCard(repo: RepoRef, issue: IssueInfo, column?: CardColumn) {
  if (!repo.projectId) return null;

  const fields = {
    title: issue.title,
    description: issue.body ?? null,
    githubIssueNumber: issue.number,
    githubUrl: issue.html_url,
  };
  const existing = await db.card.findUnique({
    where: { githubIssueId: BigInt(issue.id) },
    select: { id: true, column: true },
  });

  if (existing) {
    const move = column && column !== existing.column;
    await db.card.update({
      where: { id: existing.id },
      data: move
        ? { ...fields, column, position: await nextPosition(repo.projectId, column) }
        : fields,
    });
    return move ? existing.id : null;
  }

  const startColumn = column ?? (issue.state === "closed" ? "DONE" : "BACKLOG");
  await db.card.create({
    data: {
      ...fields,
      githubIssueId: BigInt(issue.id),
      column: startColumn,
      position: await nextPosition(repo.projectId, startColumn),
      projectId: repo.projectId,
      repoId: repo.id,
    },
  });
  return null;
}

export async function handleIssueEvent(repo: RepoRef, action: string, issue: IssueInfo) {
  if (action === "deleted" || action === "transferred") {
    await db.card.deleteMany({ where: { githubIssueId: BigInt(issue.id) } });
    return;
  }
  let column: CardColumn | undefined;
  if (action === "closed") column = "DONE";
  if (action === "reopened") {
    // Reopened from GitHub: back to To do. But when Shiplog reopened it (the
    // user dragged the card out of Done), the card has already moved, so
    // leave it where the user put it.
    const card = await db.card.findUnique({
      where: { githubIssueId: BigInt(issue.id) },
      select: { column: true },
    });
    if (!card || card.column === "DONE") column = "TODO";
  }
  const moved = await upsertIssueCard(repo, issue, column);
  if (moved) await pushCardStatus(moved);
}

// Same-repo issue numbers a PR says it closes, e.g. "Fixes #12, closes #3".
export function closingIssueNumbers(text: string) {
  const pattern = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?\s+#(\d+)\b/gi;
  return [...new Set([...text.matchAll(pattern)].map((match) => Number(match[1])))];
}

// Moves the cards a PR references: draft → In progress, ready for review →
// In review, merged → Done. Closing without merging sends them back.
export async function handlePullRequestEvent(repo: RepoRef, action: string, pr: PullRequestInfo) {
  if (!repo.projectId) return;
  const projectId = repo.projectId;

  if (action === "closed" && !pr.merged) {
    const cards = await db.card.findMany({
      where: { repoId: repo.id, linkedPrNumber: pr.number, column: { not: "DONE" } },
      select: { id: true },
    });
    for (const card of cards) {
      await db.card.update({
        where: { id: card.id },
        data: {
          linkedPrNumber: null,
          prChecks: null,
          prReview: null,
          column: "IN_PROGRESS",
          position: await nextPosition(projectId, "IN_PROGRESS"),
        },
      });
      await pushCardStatus(card.id);
    }
    return;
  }

  // New commits on the PR: its checks start over.
  if (action === "synchronize") {
    await refreshPrStatusSafely(repo.id, [pr.number]);
    return;
  }

  let column: CardColumn;
  if (action === "closed") column = "DONE";
  else if (["opened", "reopened", "edited", "ready_for_review", "converted_to_draft"].includes(action)) {
    column = pr.draft ? "IN_PROGRESS" : "IN_REVIEW";
  } else return;

  const numbers = closingIssueNumbers(`${pr.title}\n${pr.body ?? ""}`);
  if (numbers.length === 0) return;

  const cards = await db.card.findMany({
    where: { repoId: repo.id, githubIssueNumber: { in: numbers } },
    select: { id: true, column: true },
  });
  for (const card of cards) {
    // A finished card only moves again when the user reopens the issue.
    if (card.column === "DONE") continue;
    if (card.column === column) {
      await db.card.update({ where: { id: card.id }, data: { linkedPrNumber: pr.number } });
      continue;
    }
    await db.card.update({
      where: { id: card.id },
      data: { linkedPrNumber: pr.number, column, position: await nextPosition(projectId, column) },
    });
    await pushCardStatus(card.id);
  }
  if (action !== "closed") await refreshPrStatusSafely(repo.id, [pr.number]);
}

// CI and review status is a nice-to-have: a GitHub hiccup (or a missing
// Checks permission) shouldn't fail the whole webhook delivery.
export async function refreshPrStatusSafely(repoId: string, prNumbers: number[]) {
  try {
    await refreshPrStatus(repoId, prNumbers);
  } catch (error) {
    console.error("Couldn't refresh PR status:", error);
  }
}

// Pulls the open issues of each of the project's repos into cards.
export async function importOpenIssues(projectId: string) {
  const repos = await db.repo.findMany({
    where: { projectId },
    include: { installation: { select: { githubInstallId: true } } },
  });

  let count = 0;
  for (const repo of repos) {
    const octokit = await getGithubApp().getInstallationOctokit(
      Number(repo.installation.githubInstallId),
    );
    const [owner, name] = repo.fullName.split("/");
    const issues = await octokit.paginate("GET /repos/{owner}/{repo}/issues", {
      owner,
      repo: name,
      state: "open",
      per_page: 100,
    });
    // This endpoint also returns pull requests; those aren't cards.
    for (const issue of issues.filter((item) => !item.pull_request)) {
      await upsertIssueCard(repo, issue);
      count++;
    }
  }
  return count;
}
