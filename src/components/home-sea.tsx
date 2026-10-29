import { getSession } from "@/auth";
import { Sailboat } from "@/components/sailboat";
import { db } from "@/lib/db";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const oneWeekAgo = () => new Date(Date.now() - WEEK_MS);
// About this many events in a week makes for the roughest sea.
const BUSY_WEEK = 40;

// The homepage sea: a sailboat on waves that are as rough as your past week
// was busy. Signed-out visitors get a gentle default. Render inside <Suspense>.
export async function HomeSea() {
  const session = await getSession();
  let events: number | null = null;
  if (session?.user?.id) {
    events = await db.githubEvent.count({
      where: {
        occurredAt: { gte: oneWeekAgo() },
        repo: { installation: { userId: session.user.id } },
      },
    });
  }
  const intensity = events === null ? 0.3 : Math.min(1, events / BUSY_WEEK);
  const mood = intensity < 0.25 ? "Calm seas" : intensity < 0.6 ? "A steady breeze" : "Choppy waters";

  return (
    <>
      <div
        aria-hidden
        // -bottom-6 cancels <main>'s bottom padding so the sea reaches the page edge.
        className="pointer-events-none absolute -bottom-6 left-1/2 -z-10 h-50 w-screen -translate-x-1/2 [mask-image:linear-gradient(to_top,black_55%,transparent)]"
      >
        <Sailboat intensity={intensity} />
      </div>
      {events !== null && (
        <p className="text-xs text-white/70">
          ⛵ {mood}: {events} GitHub event{events === 1 ? "" : "s"} this week. The sea below follows
          your activity.
        </p>
      )}
    </>
  );
}
