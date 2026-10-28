import Link from "next/link";
import { getContributions, type ContributionLevel } from "@/lib/contributions";

// Shiplog's palette instead of GitHub's greens: quiet teal for light days,
// warm orange for busy ones.
const LEVEL_CLASS: Record<ContributionLevel, string> = {
  NONE: "bg-white/10",
  FIRST_QUARTILE: "bg-cyan-800",
  SECOND_QUARTILE: "bg-cyan-500",
  THIRD_QUARTILE: "bg-orange-400",
  FOURTH_QUARTILE: "bg-orange-500 shadow-[0_0_6px] shadow-orange-400/70",
};

const LEVELS = Object.keys(LEVEL_CLASS) as ContributionLevel[];

const monthName = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleString("en-GB", { month: "short", timeZone: "UTC" });

const longDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

// The past year of GitHub contributions as a heatmap, plus the repos with the
// most commits. Reads from GitHub, so render it inside <Suspense>.
export async function GitHubActivity({
  userId,
  selectedDay,
  sort,
}: {
  userId: string;
  selectedDay?: string;
  sort?: string;
}) {
  const data = await getContributions(userId);

  // Clicking a day selects it; clicking it again closes the panel. Keeps the
  // current project sort in the URL.
  const dayHref = (date: string, selected: boolean) => {
    const params = new URLSearchParams();
    if (sort) params.set("sort", sort);
    if (!selected) params.set("day", date);
    const query = params.toString();
    return query ? `/dashboard?${query}` : "/dashboard";
  };

  if (!data.ok) {
    const message =
      data.reason === "github-error"
        ? "Couldn't load your GitHub activity right now. It will retry in a moment."
        : "Your GitHub sign-in needs refreshing to show your activity: sign out, then sign in again.";
    return <section className="glass rounded-3xl p-5 text-sm text-white/80">{message}</section>;
  }

  // A month label above the first column of each month, skipping a month that
  // only gets one or two columns at the very start (it would overlap the next).
  const starts = data.weeks.map(
    (week, i) => i === 0 || monthName(week[0].date) !== monthName(data.weeks[i - 1][0].date),
  );
  const monthLabels = data.weeks.map((week, i) => {
    if (!starts[i]) return "";
    const next = starts.indexOf(true, i + 1);
    return next !== -1 && next - i < 3 ? "" : monthName(week[0].date);
  });
  // Columns share the panel's width, but never get smaller than 9px.
  const columns = { gridTemplateColumns: `repeat(${data.weeks.length}, minmax(9px, 1fr))` };

  return (
    <section aria-labelledby="activity-title" className="glass flex flex-col gap-4 rounded-3xl p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="activity-title" className="font-semibold">
          {data.total.toLocaleString("en-GB")} contributions{" "}
          <span className="font-serif text-xl font-normal italic">in the last year</span>
          <span className="ml-2 text-xs font-normal text-white/60">Click a day to see what you did.</span>
        </h2>
        <a
          href={`https://github.com/${data.login}`}
          className="font-mono text-xs text-white/70 hover:text-white hover:underline"
        >
          @{data.login}
        </a>
      </header>

      {/* Scrolls sideways on small screens; most recent weeks are on the right. */}
      <div className="-mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-max flex-col gap-1.5 sm:min-w-0">
          <div aria-hidden className="grid gap-[3px] text-[10px] text-white/60" style={columns}>
            {monthLabels.map((label, i) => (
              <span key={i} className="overflow-visible whitespace-nowrap">
                {label}
              </span>
            ))}
          </div>
          <div className="grid gap-[3px]" style={columns}>
            {data.weeks.map((week) => (
              <div key={week[0].date} className="grid grid-rows-7 gap-[3px]">
                {week.map((day) => {
                  const label = `${day.contributionCount} contribution${day.contributionCount === 1 ? "" : "s"} on ${longDate(day.date)}`;
                  const selected = day.date === selectedDay;
                  return (
                    // Each day opens its detail panel below (projects + journal).
                    <Link
                      key={day.date}
                      href={dayHref(day.date, selected)}
                      scroll={false}
                      title={label}
                      aria-label={selected ? `${label}, selected` : label}
                      aria-current={selected ? "date" : undefined}
                      style={{ gridRowStart: day.weekday + 1 }}
                      className={`aspect-square w-full rounded-[3px] transition-transform hover:scale-125 focus-visible:outline-2 focus-visible:outline-white ${LEVEL_CLASS[day.contributionLevel]} ${
                        selected ? "scale-125 ring-2 ring-white" : ""
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <details className="group/top min-w-0 flex-1 rounded-2xl border border-white/15 bg-black/25">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium [&::-webkit-details-marker]:hidden">
            Top contributions in:
            <span className="flex items-center gap-2">
              <span className="flex -space-x-2">
                {data.topRepos.slice(0, 3).map((repo) => (
                  // eslint-disable-next-line @next/next/no-img-element -- small GitHub avatar, no image config needed
                  <img
                    key={repo.name}
                    src={repo.avatarUrl}
                    alt=""
                    className="size-6 rounded-full border-2 border-neutral-900"
                  />
                ))}
              </span>
              <span
                aria-hidden
                className="grid size-6 place-items-center rounded-full border border-white/30 text-xs transition-transform group-open/top:rotate-180"
              >
                ⌄
              </span>
            </span>
          </summary>
          {data.topRepos.length === 0 ? (
            <p className="px-4 pb-3 text-sm text-white/70">No commits in the last year.</p>
          ) : (
            <ol className="flex flex-col gap-1 px-4 pb-3">
              {data.topRepos.map((repo) => (
                <li key={repo.name} className="flex items-center justify-between gap-3 text-sm">
                  <a href={repo.url} className="truncate hover:underline">
                    {repo.name}
                    {repo.isPrivate && <span className="ml-2 text-xs text-white/60">private</span>}
                  </a>
                  <span className="shrink-0 font-mono text-xs text-white/70">
                    {repo.commits} commit{repo.commits === 1 ? "" : "s"}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </details>

        <div aria-hidden className="flex items-center gap-1.5 text-[10px] text-white/60">
          Less
          {LEVELS.map((level) => (
            <span key={level} className={`size-[11px] rounded-[3px] ${LEVEL_CLASS[level]}`} />
          ))}
          More
        </div>
      </div>
    </section>
  );
}

// Same footprint as the real thing, so the page doesn't jump when it loads.
export function GitHubActivitySkeleton() {
  return (
    <section aria-hidden className="glass flex h-[17rem] flex-col gap-4 rounded-3xl p-5">
      <div className="h-5 w-64 animate-pulse rounded-full bg-white/15" />
      <div className="flex-1 animate-pulse rounded-2xl bg-white/10" />
    </section>
  );
}
