"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getSession } from "@/auth";
import { CardColumn } from "@/generated/prisma/enums";
import { importOpenIssues, nextPosition } from "@/lib/cards";
import { db } from "@/lib/db";
import { pushCardStatus } from "@/lib/github-sync";

// Server actions are public endpoints: every one re-checks that the signed-in
// user owns the project or card it touches.
async function requireUserId() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Not signed in");
  return session.user.id;
}

async function requireOwnedProject(projectId: string) {
  const userId = await requireUserId();
  const project = await db.project.findFirst({ where: { id: projectId, userId } });
  if (!project) throw new Error("Project not found");
  return project;
}

async function requireOwnedCard(cardId: string) {
  const userId = await requireUserId();
  const card = await db.card.findFirst({ where: { id: cardId, project: { userId } } });
  if (!card) throw new Error("Card not found");
  return card;
}

const columnSchema = z.enum(CardColumn);
const titleSchema = z.string().trim().min(1).max(200);

// Moves the card, then mirrors the move on its GitHub issue (close/reopen and
// a status label). Returns a warning when GitHub couldn't be updated.
export async function moveCardAction(cardId: string, column: CardColumn): Promise<{ warning?: string }> {
  const card = await requireOwnedCard(cardId);
  const target = columnSchema.parse(column);
  if (card.column === target) return {};

  await db.card.update({
    where: { id: card.id },
    data: { column: target, position: await nextPosition(card.projectId, target) },
  });
  const sync = await pushCardStatus(card.id);
  refresh();
  return sync.ok ? {} : { warning: sync.message };
}

export async function addCardAction(projectId: string, title: string) {
  const project = await requireOwnedProject(projectId);
  await db.card.create({
    data: {
      title: titleSchema.parse(title),
      column: "BACKLOG",
      position: await nextPosition(project.id, "BACKLOG"),
      projectId: project.id,
    },
  });
  refresh();
}

// Only private to-dos can be deleted here; issue cards follow GitHub.
export async function deleteCardAction(cardId: string) {
  const card = await requireOwnedCard(cardId);
  if (card.githubIssueId !== null) throw new Error("Close the issue on GitHub instead");
  await db.card.delete({ where: { id: card.id } });
  refresh();
}

export async function setPublicAction(projectId: string, isPublic: boolean) {
  const project = await requireOwnedProject(projectId);
  await db.project.update({ where: { id: project.id }, data: { isPublic: z.boolean().parse(isPublic) } });
  refresh();
}

const changelogSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(2000).optional(),
});

export async function addChangelogAction(projectId: string, input: { title: string; body?: string }) {
  const project = await requireOwnedProject(projectId);
  const { title, body } = changelogSchema.parse(input);
  await db.changelogItem.create({
    data: { title, body: body || null, source: "MANUAL", projectId: project.id },
  });
  refresh();
}

export async function deleteChangelogAction(itemId: string) {
  const userId = await requireUserId();
  await db.changelogItem.deleteMany({ where: { id: itemId, project: { userId } } });
  refresh();
}

export async function importIssuesAction(projectId: string) {
  const project = await requireOwnedProject(projectId);
  const count = await importOpenIssues(project.id);
  refresh();
  return count;
}
