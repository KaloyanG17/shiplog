import { describe, expect, it } from "vitest";
import type { ContributionDay } from "@/lib/contributions";
import { sampleContributions } from "@/lib/sample-contributions";

// 52 weeks of empty days starting on a Sunday.
const year: ContributionDay[][] = Array.from({ length: 52 }, (_, w) =>
  Array.from({ length: 7 }, (_, weekday) => ({
    date: new Date(Date.UTC(2025, 10, 2 + w * 7 + weekday)).toISOString().slice(0, 10),
    weekday,
    contributionCount: 0,
    contributionLevel: "NONE" as const,
  })),
);

describe("sampleContributions", () => {
  it("keeps the real dates and is the same on every call", () => {
    const a = sampleContributions(year);
    const b = sampleContributions(year);
    expect(a).toEqual(b);
    expect(a.weeks.flat().map((day) => day.date)).toEqual(year.flat().map((day) => day.date));
  });

  it("totals the daily counts and only marks empty days as NONE", () => {
    const { weeks, total } = sampleContributions(year);
    const days = weeks.flat();
    expect(total).toBe(days.reduce((sum, day) => sum + day.contributionCount, 0));
    for (const day of days) expect(day.contributionLevel === "NONE").toBe(day.contributionCount === 0);
  });

  it("fills most of the year", () => {
    const active = sampleContributions(year).weeks.flat().filter((day) => day.contributionCount > 0);
    expect(active.length).toBeGreaterThan(150);
  });
});
