import Link from "next/link";
import { getSession } from "@/auth";
import { SignInButton } from "@/components/auth-buttons";

const primaryClass = "btn-primary h-12 px-7 text-sm";

// Signed-in visitors get a way into the app instead of a sign-in button.
// Reads the session, so it must be rendered inside <Suspense>.
export async function HomeCta() {
  const session = await getSession();
  if (session?.user) {
    return (
      <Link href="/dashboard" className={primaryClass}>
        Open your dashboard
      </Link>
    );
  }
  return <SignInButton className={primaryClass} />;
}

// Same size as the button, so the hero doesn't shift while the session loads.
export function HomeCtaPlaceholder() {
  return <span aria-hidden className="inline-block h-12 w-48 rounded-full bg-white/15" />;
}
