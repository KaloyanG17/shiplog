"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getSession } from "@/auth";
import { db } from "@/lib/db";
import { generateJournalDraft, JournalError, localDay } from "@/lib/journal";

// Errors come back as values: thrown messages are hidden in production builds.
export type ActionResult = { error?: string; message?: string };

async function requireUserId() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Not signed in");
  return session.user.id;
}

const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// Writes (or rewrites) the AI draft for a day, replacing any edits.
export async function generateEntryAction(day: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsedDay = daySchema.safeParse(day);
  if (!parsedDay.success || parsedDay.data > localDay(new Date())) {
    return { error: "That day can't have a journal entry yet." };
  }

  try {
    const result = await generateJournalDraft(userId, parsedDay.data, { replaceEdits: true });
    refresh();
    if (result.status === "no-activity") {
      return { error: "No GitHub activity recorded for this day, so there's nothing to write about yet." };
    }
    return { message: result.status === "created" ? "Draft written." : "Draft rewritten." };
  } catch (error) {
    if (error instanceof JournalError) return { error: error.message };
    console.error("Journal generation failed:", error);
    return { error: "Couldn't reach Gemini. Try again in a moment." };
  }
}

const textSchema = z.string().max(10_000);

// Saves the user's edited text. Saving empty text goes back to the AI draft.
export async function saveEntryAction(entryId: string, text: string): Promise<ActionResult> {
  const userId = await requireUserId();
  const parsed = textSchema.safeParse(text);
  if (!parsed.success) return { error: "That entry is too long (10,000 characters max)." };

  const { count } = await db.journalEntry.updateMany({
    where: { id: entryId, userId },
    data: { content: parsed.data.trim() || null },
  });
  if (count === 0) return { error: "Entry not found." };
  refresh();
  return { message: "Saved." };
}
