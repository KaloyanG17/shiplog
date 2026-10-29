import { Suspense } from "react";
import { FolderAction, FolderCard } from "@/components/folder-card";
import { HomeCta, HomeCtaPlaceholder } from "@/components/home-cta";
import { HomeSea } from "@/components/home-sea";
import { HowItWorksVideo } from "@/components/how-it-works-video";

const steps = [
  { title: "Plan", text: "Issues become cards" },
  { title: "Code", text: "PRs move cards for you" },
  { title: "Log", text: "AI writes up your day" },
  { title: "Share", text: "Roadmap and changelog" },
];

export default function Home() {
  return (
    // On wide screens everything fits in one viewport: hero left, steps right.
    // The height is the viewport minus the header (3.5rem + 1px border) and
    // main's padding (3rem).
    <div className="relative isolate grid items-center gap-10 text-white lg:min-h-[calc(100svh-6.5rem-1px)] lg:grid-cols-[1.15fr_1fr]">
      <section className="flex flex-col gap-5">
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
          <HowItWorksVideo />
        </div>

        {/* The sea strip along the bottom of the page, plus its caption. */}
        <Suspense fallback={null}>
          <HomeSea />
        </Suspense>
      </section>

      <section id="how-it-works" aria-labelledby="how-heading" className="relative flex scroll-mt-20 flex-col gap-3">
        <h2 id="how-heading" className="font-serif text-2xl italic">
          How it works
        </h2>
        <ol className="grid grid-cols-1 gap-x-5 gap-y-6 sm:grid-cols-2">
          {steps.map((step, i) => (
            <li key={step.title}>
              <FolderCard
                title={step.title}
                meta={`Step ${i + 1}`}
                description={step.text}
                paper={i}
                className="h-52"
                action={<FolderAction>{i + 1}</FolderAction>}
              />
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
