import { Suspense } from "react";
import { HomeCta, HomeCtaPlaceholder } from "@/components/home-cta";
import { HeroShader } from "@/components/hero-shader";

const steps = [
  { title: "Plan", text: "A personal board where your GitHub issues show up as cards." },
  { title: "Code", text: "Work in GitHub as usual. PRs move your cards automatically." },
  { title: "Log", text: "Each day's activity becomes a journal entry, drafted by AI." },
  { title: "Share", text: "Publish a roadmap and changelog for your projects." },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-16">
      <section className="relative isolate overflow-hidden rounded-3xl bg-cyan-950 text-white">
        <HeroShader />
        {/* Keeps the text readable over the brightest parts of the gradient. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent"
        />

        <div className="relative flex min-h-[32rem] flex-col justify-center gap-6 px-6 py-14 sm:px-12">
          <p className="w-fit rounded-full bg-white/15 px-4 py-1.5 text-sm font-medium backdrop-blur">
            ✨ New: an AI-written dev journal
          </p>

          <h1 className="flex flex-col leading-none tracking-tight">
            <span className="bg-gradient-to-r from-orange-200 via-white to-cyan-200 bg-clip-text text-5xl font-thin text-transparent sm:text-6xl">
              Plan, code,
            </span>
            <span className="text-6xl font-black sm:text-8xl">Ship.</span>
            <span className="font-serif text-5xl italic sm:text-7xl">Remember it all.</span>
          </h1>

          <p className="max-w-lg text-base text-white/85 sm:text-lg">
            Shiplog watches your GitHub, keeps your board up to date, and writes your dev journal for
            you every evening.
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <Suspense fallback={<HomeCtaPlaceholder />}>
              <HomeCta />
            </Suspense>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center rounded-full border border-white/60 px-7 text-sm font-semibold transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              See how it works
            </a>
          </div>
        </div>

        <LoopBadge />
      </section>

      <section id="how-it-works" aria-labelledby="how-heading" className="flex scroll-mt-8 flex-col gap-4">
        <h2 id="how-heading" className="text-xl font-semibold">
          How it works
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.title} className="rounded-lg border border-foreground/10 p-4">
              <p className="text-sm text-foreground/50">{i + 1}</p>
              <h3 className="font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-foreground/70">{step.text}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// Slowly spinning "PLAN · CODE · LOG · SHARE" ring, bottom-right of the hero.
function LoopBadge() {
  return (
    <div aria-hidden className="absolute right-6 bottom-6 hidden size-28 sm:block">
      <svg viewBox="0 0 100 100" className="size-full animate-[spin_24s_linear_infinite] motion-reduce:animate-none">
        <defs>
          <path id="loop-circle" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
        </defs>
        <text className="fill-white text-[10.5px] font-semibold tracking-[0.2em] uppercase">
          <textPath href="#loop-circle">Plan · Code · Log · Share ·</textPath>
        </text>
      </svg>
      <span className="absolute inset-0 grid place-items-center text-3xl">⛵</span>
    </div>
  );
}
