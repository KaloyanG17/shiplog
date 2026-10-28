"use server";

import { refresh } from "next/cache";
import { getSession } from "@/auth";
import { syncAllInstallations } from "@/lib/installations";

export async function syncReposAction() {
  const session = await getSession();
  if (!session?.user?.id) return;

  await syncAllInstallations(session.user.id);
  refresh();
}
