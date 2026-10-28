import Link from "next/link";
import { getSession } from "@/auth";
import { SignOutButton } from "@/components/auth-buttons";

// Reads the session, so it must be rendered inside <Suspense>.
export async function UserMenu() {
  const session = await getSession();

  if (!session?.user) {
    return (
      <Link href="/login" className="text-sm font-medium hover:underline">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Link href="/dashboard" className="text-sm font-medium hover:underline">
        Dashboard
      </Link>
      <Link href="/journal" className="text-sm font-medium hover:underline">
        Journal
      </Link>
      {session.user.image && (
        // eslint-disable-next-line @next/next/no-img-element -- small avatar, no need for next/image config
        <img src={session.user.image} alt="" className="h-7 w-7 rounded-full" />
      )}
      <SignOutButton />
    </div>
  );
}
