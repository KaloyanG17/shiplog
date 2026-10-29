"use server";

import { cookies } from "next/headers";
import { refresh } from "next/cache";
import { getSession } from "@/auth";
import { syncAllInstallations } from "@/lib/installations";
import { SAMPLE_COOKIE } from "@/lib/sample-contributions";

export async function syncReposAction() {
  const session = await getSession();
  if (!session?.user?.id) return;

  await syncAllInstallations(session.user.id);
  refresh();
}

// Switches the heatmap between real GitHub data and labelled sample data.
export async function setSampleDataAction(on: boolean) {
  const session = await getSession();
  if (!session?.user?.id) return;

  // Written both ways (instead of deleted) so the path always matches.
  (await cookies()).set(SAMPLE_COOKIE, on ? "1" : "0", {
    path: "/dashboard",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  refresh();
}
