// Turns stored GitHub events into one-line summaries, e.g. for the project
// activity feed (and later the journal).

type EventRow = { type: string; action: string | null; payload: unknown };

type Summary = { text: string; url?: string };

type IssuePayload = { issue: { number: number; title: string; html_url: string } };
type PullRequestPayload = {
  pull_request: { number: number; title: string; html_url: string; merged?: boolean };
};
type PushPayload = {
  ref: string;
  compare: string;
  commits: { message: string }[];
};

export function summarizeEvent({ type, action, payload }: EventRow): Summary {
  switch (type) {
    case "issues": {
      const { issue } = payload as IssuePayload;
      return { text: `${action} issue #${issue.number}: ${issue.title}`, url: issue.html_url };
    }
    case "pull_request": {
      const { pull_request: pr } = payload as PullRequestPayload;
      const verb = action === "closed" && pr.merged ? "merged" : action;
      return { text: `${verb} PR #${pr.number}: ${pr.title}`, url: pr.html_url };
    }
    case "push": {
      const push = payload as PushPayload;
      const branch = push.ref.replace("refs/heads/", "");
      const count = push.commits.length;
      const first = push.commits[0]?.message.split("\n")[0];
      const text =
        count === 0
          ? `pushed to ${branch}`
          : `pushed ${count} commit${count === 1 ? "" : "s"} to ${branch}: ${first}`;
      return { text, url: push.compare };
    }
    default:
      return { text: `${type}${action ? `.${action}` : ""}` };
  }
}
