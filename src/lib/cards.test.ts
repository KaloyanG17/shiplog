import { describe, expect, it } from "vitest";
import { closingIssueNumbers } from "@/lib/cards";

describe("closingIssueNumbers", () => {
  it("finds GitHub's closing keywords in any case", () => {
    expect(closingIssueNumbers("Fixes #12, closes #3 and Resolved #40")).toEqual([12, 3, 40]);
    expect(closingIssueNumbers("FIX #7")).toEqual([7]);
  });

  it("accepts a colon after the keyword", () => {
    expect(closingIssueNumbers("Fixes: #5")).toEqual([5]);
  });

  it("ignores plain mentions and other words", () => {
    expect(closingIssueNumbers("See #12, related to #13")).toEqual([]);
    expect(closingIssueNumbers("prefixes #9")).toEqual([]);
  });

  it("returns each issue once", () => {
    expect(closingIssueNumbers("fixes #4\n\nAlso closes #4")).toEqual([4]);
  });
});
