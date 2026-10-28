"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { ensureVoterHash } from "@/lib/voter";

// Public endpoint (no sign-in): toggles the visitor's vote on a roadmap card.
// Only cards on public projects that aren't finished can be voted on.
export async function toggleVoteAction(cardId: string): Promise<{ error?: string }> {
  const id = z.string().min(1).max(40).safeParse(cardId);
  if (!id.success) return { error: "Unknown card." };

  const card = await db.card.findFirst({
    where: { id: id.data, column: { not: "DONE" }, project: { isPublic: true } },
    select: { id: true },
  });
  if (!card) return { error: "This card can't be voted on." };

  const voterHash = await ensureVoterHash();
  const where = { cardId_voterHash: { cardId: card.id, voterHash } };
  const existing = await db.roadmapVote.findUnique({ where, select: { id: true } });
  if (existing) {
    await db.roadmapVote.delete({ where });
  } else {
    // createMany + skipDuplicates: a double click can't create two votes.
    await db.roadmapVote.createMany({ data: { cardId: card.id, voterHash }, skipDuplicates: true });
  }
  refresh();
  return {};
}
