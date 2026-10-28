import { connection, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dayRange, generateJournalDraft, JournalError, localDay } from "@/lib/journal";

// Evening job: writes a journal draft for every user who had GitHub activity
// today and doesn't have an entry yet. Vercel Cron calls it on the schedule in
// vercel.json and sends `Authorization: Bearer $CRON_SECRET`.
// Locally: curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/journal
export async function GET(request: NextRequest) {
  await connection();

  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET is not set" }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dayParam = request.nextUrl.searchParams.get("day");
  const day = dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam) ? dayParam : localDay(new Date());
  const { start, end } = dayRange(day);

  const users = await db.user.findMany({
    where: {
      installations: {
        some: {
          repos: {
            some: { isPrivate: false, events: { some: { occurredAt: { gte: start, lt: end } } } },
          },
        },
      },
    },
    select: { id: true },
  });

  const results: Record<string, number> = {};
  for (const user of users) {
    let status: string;
    try {
      status = (await generateJournalDraft(user.id, day, { replaceEdits: false })).status;
    } catch (error) {
      // One user's failure shouldn't stop the others.
      console.error(`Journal draft failed for user ${user.id}:`, error);
      status = error instanceof JournalError ? "skipped" : "failed";
    }
    results[status] = (results[status] ?? 0) + 1;
  }

  return Response.json({ day, users: users.length, results });
}
