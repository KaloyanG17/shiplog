import { signIn, signOut } from "@/auth";

export function SignInButton({
  redirectTo = "/dashboard",
  className = "btn-primary h-11 px-6 text-sm",
}: {
  redirectTo?: string;
  className?: string;
}) {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("github", { redirectTo });
      }}
    >
      <button type="submit" className={className}>
        Sign in with GitHub
      </button>
    </form>
  );
}

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/" });
      }}
    >
      <button type="submit" className="text-sm text-foreground/70 hover:text-foreground">
        Sign out
      </button>
    </form>
  );
}
