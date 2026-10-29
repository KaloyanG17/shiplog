import { describe, expect, it } from "vitest";
import { dayRange, dayToDate, isTransient, localDay } from "@/lib/journal";

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

describe("isTransient", () => {
  // Production builds minify class names, so a timeout can't be spotted by name.
  it("treats an error with no HTTP response as transient", () => {
    class eG extends Error {}
    expect(isTransient(new eG("Request timed out"))).toBe(true);
    expect(isTransient(Object.assign(new Error("timed out"), { status: undefined }))).toBe(true);
  });

  it("retries busy and quota errors but not bad requests", () => {
    expect(isTransient({ status: 503 })).toBe(true);
    expect(isTransient({ status: 429 })).toBe(true);
    expect(isTransient({ status: 400 })).toBe(false);
    expect(isTransient({ status: 404 })).toBe(false);
  });
});
