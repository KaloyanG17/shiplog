import type { ContributionDay, ContributionLevel } from "@/lib/contributions";

// Demo mode for the heatmap: a believable year of activity laid over the same
// dates as the real calendar. The dashboard always labels it as sample data;
// it's for screenshots and demos, never presented as someone's real history.

export const SAMPLE_COOKIE = "shiplog_sample_heatmap";

// Small seeded PRNG (mulberry32), so the sample looks the same on every load.
function random(seed: string) {
  let state = 0;
  for (const char of seed) state = (state * 31 + char.charCodeAt(0)) | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// GitHub-style levels: quartiles of the non-zero days.
function levelsFor(counts: number[]): (count: number) => ContributionLevel {
  const busy = counts.filter((count) => count > 0).sort((a, b) => a - b);
  const at = (q: number) => busy[Math.floor((busy.length - 1) * q)] ?? 0;
  const [q1, q2, q3] = [at(0.25), at(0.5), at(0.75)];
  return (count) =>
    count === 0
      ? "NONE"
      : count <= q1
        ? "FIRST_QUARTILE"
        : count <= q2
          ? "SECOND_QUARTILE"
          : count <= q3
            ? "THIRD_QUARTILE"
            : "FOURTH_QUARTILE";
}

export function sampleContributions(weeks: ContributionDay[][], seed = "shiplog") {
  const next = random(seed);
  const counts = weeks.map((week, w) => {
    // Busier toward the present, with the odd quiet week (holidays, exams…).
    const ramp = 0.45 + 0.55 * (w / Math.max(1, weeks.length - 1));
    const quietWeek = next() < 0.1;
    return week.map((day) => {
      const weekend = day.weekday === 0 || day.weekday === 6;
      const chance = (weekend ? 0.3 : 0.78) * (quietWeek ? 0.2 : 1);
      return next() < chance ? 1 + Math.floor(next() ** 2 * 14 * ramp) : 0;
    });
  });

  const level = levelsFor(counts.flat());
  const sampleWeeks = weeks.map((week, w) =>
    week.map((day, d) => ({ ...day, contributionCount: counts[w][d], contributionLevel: level(counts[w][d]) })),
  );
  return { weeks: sampleWeeks, total: counts.flat().reduce((sum, count) => sum + count, 0) };
}
