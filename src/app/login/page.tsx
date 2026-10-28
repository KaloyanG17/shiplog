import { SignInButton } from "@/components/auth-buttons";

export default function LoginPage() {
  return (
    <div className="glass mx-auto flex max-w-sm flex-col items-center gap-4 rounded-3xl px-6 py-12 text-center">
      <h1 className="flex flex-col leading-none tracking-tight">
        <span className="text-4xl font-black">Welcome</span>
        <span className="font-serif text-4xl italic">aboard.</span>
      </h1>
      <p className="text-sm text-white/80">
        Shiplog uses your GitHub account. Repo access is requested separately, later.
      </p>
      <SignInButton />
    </div>
  );
}
