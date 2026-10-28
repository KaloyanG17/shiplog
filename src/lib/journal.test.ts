import { describe, expect, it } from "vitest";
import { dayRange, dayToDate, localDay } from "@/lib/journal";

// JOURNAL_TIME_ZONE is Europe/Sofia in vitest.config.mts:
// UTC+2 in winter, UTC+3 in summer.
describe("dayRange", () => {
  it("covers a winter day (UTC+2)", () => {
    const { start, end } = dayRange("2026-10-28");
    expect(start.toISOString()).toBe("2026-10-27T22:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-28T22:00:00.000Z");
  });

  it("covers a summer day (UTC+3)", () => {
    expect(dayRange("2026-07-15").start.toISOString()).toBe("2026-07-14T21:00:00.000Z");
  });

  it("is 25 hours long on the day clocks go back", () => {
    const { start, end } = dayRange("2026-10-25");
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(25);
  });

  it("is 23 hours long on the day clocks go forward", () => {
    const { start, end } = dayRange("2026-03-29");
    expect((end.getTime() - start.getTime()) / 3_600_000).toBe(23);
  });
});

describe("localDay", () => {
  it("uses the journal time zone, not UTC", () => {
    // 23:30 UTC on the 27th is already 01:30 on the 28th in Sofia.
    expect(localDay(new Date("2026-10-27T23:30:00Z"))).toBe("2026-10-28");
  });

  it("round-trips with dayToDate", () => {
    expect(dayToDate("2026-01-05").toISOString()).toBe("2026-01-05T00:00:00.000Z");
  });
});
