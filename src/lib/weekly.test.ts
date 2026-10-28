import { describe, expect, it } from "vitest";
import { addDays, parseWeeklyReply, weekStartOf } from "@/lib/weekly";

describe("weekStartOf", () => {
  it("returns the Monday of the week", () => {
    expect(weekStartOf("2026-10-28")).toBe("2026-10-26"); // Wednesday
    expect(weekStartOf("2026-10-26")).toBe("2026-10-26"); // Monday itself
    expect(weekStartOf("2026-11-01")).toBe("2026-10-26"); // Sunday belongs to the week before
  });

  it("crosses month and year boundaries", () => {
    expect(weekStartOf("2027-01-01")).toBe("2026-12-28");
  });
});

describe("addDays", () => {
  it("adds across month ends", () => {
    expect(addDays("2026-10-26", 6)).toBe("2026-11-01");
  });
});

describe("parseWeeklyReply", () => {
  const reply = `SUMMARY: I shipped the board and the journal.
BULLETS:
- Built a kanban board with Next.js
- Added a daily journal written by Gemini
- Wired GitHub webhooks into the board`;

  it("reads the summary and the bullets", () => {
    expect(parseWeeklyReply(reply)).toEqual({
      summary: "I shipped the board and the journal.",
      bullets: [
        "Built a kanban board with Next.js",
        "Added a daily journal written by Gemini",
        "Wired GitHub webhooks into the board",
      ],
    });
  });

  it("keeps at most three bullets and drops duplicates", () => {
    const parsed = parseWeeklyReply(`SUMMARY: Busy week.\nBULLETS:\n* One\n* One\n• Two\n- Three\n- Four`);
    expect(parsed?.bullets).toEqual(["One", "Two", "Three"]);
  });

  it("rejects replies that ignore the format", () => {
    expect(parseWeeklyReply("Here is a lovely summary of your week!")).toBeNull();
    expect(parseWeeklyReply("SUMMARY: Something\nBULLETS:\n")).toBeNull();
  });
});
