import type { CardColumn, PrChecks, PrReview } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { getGithubApp } from "@/lib/github";

// Shiplog → GitHub. Moving an issue card closes or reopens the issue and keeps
// one "shiplog: <column>" label on it, so the issue shows where it stands.
// Changes we make come back as webhooks; cards.ts ignores the ones that would
// undo a move (see handleIssueEvent).

const STATUS_LABELS: Record<Exclude<CardColumn, "DONE">, { name: string; color: string }> = {
  BACKLOG: { name: "shiplog: backlog", color: "94a3b8" },
  TODO: { name: "shiplog: to do", color: "22d3ee" },
  IN_PROGRESS: { name: "shiplog: in progress", color: "f97316" },
  IN_REVIEW: { name: "shiplog: in review", color: "a855f7" },
};
const LABEL_PREFIX = "shiplog: ";

// Which status labels to add and remove for a card in `column`, given the
// issue's current labels. Done issues are closed, so they lose the label.
export function labelChanges(current: string[], column: CardColumn) {
  const target = column === "DONE" ? null : STATUS_LABELS[column].name;
  return {
    add: target && !current.includes(target) ? [target] : [],
    remove: current.filter((name) => name.startsWith(LABEL_PREFIX) && name !== target),
  };
}

export function issueStateFor(column: CardColumn) {
  return column === "DONE" ? "closed" : "open";
}

type CheckRun = { status: string; conclusion: string | null };

// One status for all of a commit's check runs: any failure wins, then anything
// still running; otherwise everything passed (or was skipped).
export function summarizeCheckRuns(runs: CheckRun[]): PrChecks | null {
  if (runs.length === 0) return null;
  const failed = ["failure", "timed_out", "cancelled", "action_required", "startup_failure"];
  if (runs.some((run) => run.conclusion && failed.includes(run.conclusion))) return "FAILURE";
  if (runs.some((run) => run.status !== "completed")) return "PENDING";
  return "SUCCESS";
}

type Review = { user: { id: number | bigint } | null; state: string };

// GitHub's own rule: each reviewer's latest approve/request-changes counts,
// and any outstanding "changes requested" outweighs approvals.
export function summarizeReviews(reviews: Review[]): PrReview | null {
  const latest = new Map<number | bigint, string>();
  for (const review of reviews) {
    if (!review.user) continue;
    if (["APPROVED", "CHANGES_REQUESTED", "DISMISSED"].includes(review.state)) {
      latest.set(review.user.id, review.state);
    }
  }
  const states = [...latest.values()];
  if (states.includes("CHANGES_REQUESTED")) return "CHANGES_REQUESTED";
  if (states.includes("APPROVED")) return "APPROVED";
  return null;
}

async function repoClient(repoId: string) {
  const repo = await db.repo.findUnique({
    where: { id: repoId },
    include: { installation: { select: { githubInstallId: true } } },
  });
  if (!repo) return null;
  const octokit = await getGithubApp().getInstallationOctokit(Number(repo.installation.githubInstallId));
  const [owner, name] = repo.fullName.split("/");
  return { octokit, owner, repo: name };
}

function errorStatus(error: unknown) {
  return typeof error === "object" && error !== null && "status" in error ? Number(error.status) : NaN;
}

export type SyncResult = { ok: true } | { ok: false; message: string };

// Brings a card's GitHub issue in line with its column. Never throws: the card
// has already moved in Shiplog, so a GitHub failure is reported, not fatal.
export async function pushCardStatus(cardId: string): Promise<SyncResult> {
  const card = await db.card.findUnique({
    where: { id: cardId },
    select: { column: true, repoId: true, githubIssueNumber: true },
  });
  if (!card?.repoId || card.githubIssueNumber === null) return { ok: true };

  try {
    const client = await repoClient(card.repoId);
    if (!client) return { ok: true };
    const { octokit, owner, repo } = client;
    const issue_number = card.githubIssueNumber;

    const { data: issue } = await octokit.request("GET /repos/{owner}/{repo}/issues/{issue_number}", {
      owner,
      repo,
      issue_number,
    });
    const state = issueStateFor(card.column);
    if (issue.state !== state) {
      await octokit.request("PATCH /repos/{owner}/{repo}/issues/{issue_number}", {
        owner,
        repo,
        issue_number,
        state,
        ...(state === "closed" ? { state_reason: "completed" as const } : {}),
      });
    }

    const current = issue.labels.map((label) => (typeof label === "string" ? label : (label.name ?? "")));
    const { add, remove } = labelChanges(current, card.column);
    for (const name of remove) {
      await octokit.request("DELETE /repos/{owner}/{repo}/issues/{issue_number}/labels/{name}", {
        owner,
        repo,
        issue_number,
        name,
      });
    }
    if (add.length > 0) {
      await ensureLabel(octokit, owner, repo, add[0]);
      await octokit.request("POST /repos/{owner}/{repo}/issues/{issue_number}/labels", {
        owner,
        repo,
        issue_number,
        labels: add,
      });
    }
    return { ok: true };
  } catch (error) {
    console.error("Couldn't sync card to GitHub:", error);
    return {
      ok: false,
      message:
        errorStatus(error) === 403
          ? "Moved here, but GitHub didn't allow the update. Give the Shiplog GitHub App write access to issues."
          : "Moved here, but couldn't update the issue on GitHub.",
    };
  }
}

type Octokit = Awaited<ReturnType<ReturnType<typeof getGithubApp>["getInstallationOctokit"]>>;

// Creates a status label with Shiplog's colour the first time it's used in a repo.
async function ensureLabel(octokit: Octokit, owner: string, repo: string, name: string) {
  const label = Object.values(STATUS_LABELS).find((item) => item.name === name);
  if (!label) return;
  try {
    await octokit.request("POST /repos/{owner}/{repo}/labels", { owner, repo, name, color: label.color });
  } catch (error) {
    if (errorStatus(error) !== 422) throw error; // 422: it already exists
  }
}

// Refreshes the CI and review status on every card linked to these PRs.
export async function refreshPrStatus(repoId: string, prNumbers: number[]) {
  if (prNumbers.length === 0) return;
  const cards = await db.card.count({ where: { repoId, linkedPrNumber: { in: prNumbers } } });
  if (cards === 0) return;

  const client = await repoClient(repoId);
  if (!client) return;
  const { octokit, owner, repo } = client;

  for (const pull_number of prNumbers) {
    const { data: pr } = await octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}", {
      owner,
      repo,
      pull_number,
    });
    const [runs, reviews] = await Promise.all([
      octokit.request("GET /repos/{owner}/{repo}/commits/{ref}/check-runs", {
        owner,
        repo,
        ref: pr.head.sha,
        per_page: 100,
      }),
      octokit.request("GET /repos/{owner}/{repo}/pulls/{pull_number}/reviews", {
        owner,
        repo,
        pull_number,
        per_page: 100,
      }),
    ]);
    await db.card.updateMany({
      where: { repoId, linkedPrNumber: pull_number },
      data: {
        prChecks: summarizeCheckRuns(runs.data.check_runs),
        prReview: summarizeReviews(reviews.data),
      },
    });
  }
}
