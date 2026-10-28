import { signIn, signOut } from "@/auth";

export function SignInButton({ redirectTo = "/dashboard" }: { redirectTo?: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("github", { redirectTo });
      }}
    >
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90"
      >
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
