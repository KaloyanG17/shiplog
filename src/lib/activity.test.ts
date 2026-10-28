import { describe, expect, it } from "vitest";
import { summarizeEvent } from "@/lib/activity";

describe("summarizeEvent", () => {
  it("describes issues", () => {
    const summary = summarizeEvent({
      type: "issues",
      action: "opened",
      payload: { issue: { number: 1, title: "Test", html_url: "https://github.com/a/b/issues/1" } },
    });
    expect(summary).toEqual({ text: "opened issue #1: Test", url: "https://github.com/a/b/issues/1" });
  });

  it("says merged, not closed, for merged PRs", () => {
    const summary = summarizeEvent({
      type: "pull_request",
      action: "closed",
      payload: { pull_request: { number: 4, title: "Add login", html_url: "u", merged: true } },
    });
    expect(summary.text).toBe("merged PR #4: Add login");
  });

  it("counts commits in a push and uses the first message line", () => {
    const summary = summarizeEvent({
      type: "push",
      action: null,
      payload: {
        ref: "refs/heads/main",
        compare: "c",
        commits: [{ message: "Fix header\n\nLonger body" }, { message: "Second" }],
      },
    });
    expect(summary.text).toBe("pushed 2 commits to main: Fix header");
  });

  it("uses the singular for one commit", () => {
    const summary = summarizeEvent({
      type: "push",
      action: null,
      payload: { ref: "refs/heads/dev", compare: "c", commits: [{ message: "Only one" }] },
    });
    expect(summary.text).toBe("pushed 1 commit to dev: Only one");
  });
});
