import { SignInButton } from "@/components/auth-buttons";

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-sm flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Sign in to Shiplog</h1>
      <p className="text-sm text-foreground/70">
        Shiplog uses your GitHub account. Repo access is requested separately, later.
      </p>
      <SignInButton />
    </div>
  );
}
