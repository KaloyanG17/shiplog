import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/auth";
import { connectInstallation, InstallationError } from "@/lib/installations";

// GitHub redirects here (the app's "Setup URL") after the app is installed,
// or its repo selection changed, with ?installation_id=...&setup_action=...
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const dashboard = new URL("/dashboard", request.url);
  const installationId = Number(request.nextUrl.searchParams.get("installation_id"));
  if (!Number.isSafeInteger(installationId) || installationId <= 0) {
    dashboard.searchParams.set("error", "Missing or invalid installation_id.");
    return NextResponse.redirect(dashboard);
  }

  try {
    await connectInstallation(session.user.id, installationId);
    dashboard.searchParams.set("connected", "1");
  } catch (error) {
    console.error("GitHub setup failed:", error);
    dashboard.searchParams.set(
      "error",
      error instanceof InstallationError ? error.message : "Couldn't connect to GitHub. Try again.",
    );
  }
  return NextResponse.redirect(dashboard);
}
