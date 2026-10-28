import { SignInButton } from "@/components/auth-buttons";

const steps = [
  { title: "Plan", text: "A personal board where your GitHub issues show up as cards." },
  { title: "Code", text: "Work in GitHub as usual. PRs move your cards automatically." },
  { title: "Log", text: "Each day's activity becomes a journal entry, drafted by AI." },
  { title: "Share", text: "Publish a roadmap and changelog for your projects." },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-12">
      <section className="flex flex-col items-start gap-4">
        <h1 className="text-4xl font-bold tracking-tight">Plan → Code → Log → Share</h1>
        <p className="max-w-xl text-lg text-foreground/70">
          Shiplog watches your GitHub, keeps your board up to date, and writes your dev
          journal for you.
        </p>
        <SignInButton />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, i) => (
          <div key={step.title} className="rounded-lg border border-foreground/10 p-4">
            <p className="text-sm text-foreground/50">{i + 1}</p>
            <h2 className="font-semibold">{step.title}</h2>
            <p className="mt-1 text-sm text-foreground/70">{step.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
