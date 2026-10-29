import { describe, expect, it } from "vitest";
import { issueStateFor, labelChanges, summarizeCheckRuns, summarizeReviews } from "@/lib/github-sync";

describe("labelChanges", () => {
  it("swaps the old status label for the new one and keeps the user's labels", () => {
    expect(labelChanges(["bug", "shiplog: to do"], "IN_PROGRESS")).toEqual({
      add: ["shiplog: in progress"],
      remove: ["shiplog: to do"],
    });
  });

  it("does nothing when the label is already right", () => {
    expect(labelChanges(["shiplog: in review"], "IN_REVIEW")).toEqual({ add: [], remove: [] });
  });

  it("drops every status label when the card is done", () => {
    expect(labelChanges(["shiplog: in review", "enhancement"], "DONE")).toEqual({
      add: [],
      remove: ["shiplog: in review"],
    });
  });
});

describe("issueStateFor", () => {
  it("closes done issues and keeps the rest open", () => {
    expect(issueStateFor("DONE")).toBe("closed");
    expect(issueStateFor("BACKLOG")).toBe("open");
  });
});

describe("summarizeCheckRuns", () => {
  const done = (conclusion: string) => ({ status: "completed", conclusion });

  it("is empty without runs", () => {
    expect(summarizeCheckRuns([])).toBeNull();
  });

  it("fails if any run failed, even while others are still running", () => {
    expect(summarizeCheckRuns([done("success"), done("failure"), { status: "in_progress", conclusion: null }])).toBe(
      "FAILURE",
    );
  });

  it("is pending while runs are queued or running", () => {
    expect(summarizeCheckRuns([done("success"), { status: "queued", conclusion: null }])).toBe("PENDING");
  });

  it("passes when every run succeeded or was skipped", () => {
    expect(summarizeCheckRuns([done("success"), done("skipped"), done("neutral")])).toBe("SUCCESS");
  });
});

describe("summarizeReviews", () => {
  const review = (id: number, state: string) => ({ user: { id }, state });

  it("uses each reviewer's latest decision", () => {
    expect(summarizeReviews([review(1, "CHANGES_REQUESTED"), review(1, "APPROVED")])).toBe("APPROVED");
  });

  it("lets outstanding change requests outweigh approvals", () => {
    expect(summarizeReviews([review(1, "APPROVED"), review(2, "CHANGES_REQUESTED")])).toBe("CHANGES_REQUESTED");
  });

  it("ignores comments and forgets dismissed reviews", () => {
    expect(summarizeReviews([review(1, "COMMENTED")])).toBeNull();
    expect(summarizeReviews([review(1, "APPROVED"), review(1, "DISMISSED")])).toBeNull();
  });
});
