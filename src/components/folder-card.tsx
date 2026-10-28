import Link from "next/link";
import type { ReactNode } from "react";

// Colourful "papers" peeking out of the folder, in the background's palette.
const PAPERS = [
  "from-orange-500 via-rose-400 to-cyan-700",
  "from-cyan-500 via-sky-200 to-orange-500",
  "from-amber-300 via-orange-500 to-teal-800",
  "from-teal-400 via-cyan-100 to-orange-600",
  "from-rose-500 via-orange-300 to-sky-700",
];

// Stable palette per card, so a project keeps its colour between visits.
export function paperFor(key: string) {
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash) % PAPERS.length;
}

type FolderCardProps = {
  title: string;
  /** Small monospace line under the title, e.g. "11 cards". */
  meta: string;
  description?: string | null;
  /** Makes the whole folder a link (a stretched link over the card). */
  href?: string;
  /** Round button in the bottom-right corner. */
  action?: ReactNode;
  /** Extra content in the pocket, e.g. repo links (raise links with `relative z-10`). */
  children?: ReactNode;
  paper?: number;
  className?: string;
};

// Glassmorphism folder: a back panel with a tab, a colourful paper peeking out
// of it, and a frosted front pocket holding the text. Hovering lifts the paper
// and drops the pocket a little.
export function FolderCard({
  title,
  meta,
  description,
  href,
  action,
  children,
  paper = 0,
  className = "h-60",
}: FolderCardProps) {
  return (
    <article className={`group relative isolate ${className}`}>
      {/* Back of the folder, with its tab on the right. */}
      <div aria-hidden className="absolute inset-x-0 top-5 bottom-0 rounded-3xl bg-white/25 backdrop-blur-md" />
      <div aria-hidden className="absolute top-0 right-6 h-6 w-2/5 rounded-t-2xl bg-white/25 backdrop-blur-md" />

      {/* The paper inside. */}
      <div
        aria-hidden
        className={`absolute inset-x-3 top-7 bottom-10 overflow-hidden rounded-2xl bg-gradient-to-br ${PAPERS[paper % PAPERS.length]} transition-transform duration-300 ease-out group-hover:-translate-y-3 motion-reduce:transition-none`}
      >
        <div className="absolute inset-0 bg-[repeating-linear-gradient(115deg,rgb(255_255_255/0.22)_0_5px,transparent_5px_22px)]" />
      </div>

      {/* Front pocket, with its own small tab on the left. */}
      <div className="absolute inset-x-0 bottom-0 h-[62%] transition-transform duration-300 ease-out group-hover:translate-y-1.5 motion-reduce:transition-none">
        <div aria-hidden className="absolute -top-4 left-0 h-6 w-2/5 rounded-t-2xl bg-white/80 backdrop-blur-xl" />
        <div className="relative flex h-full flex-col justify-end gap-1 rounded-3xl rounded-tl-none bg-white/80 p-5 text-neutral-900 shadow-xl shadow-black/20 backdrop-blur-xl">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold">
                {href ? (
                  <Link href={href} className="after:absolute after:inset-0 after:rounded-3xl focus-visible:outline-none">
                    {title}
                  </Link>
                ) : (
                  title
                )}
              </h3>
              <p className="font-mono text-xs text-neutral-500">{meta}</p>
              {description && <p className="mt-1 line-clamp-2 text-sm leading-snug text-neutral-700">{description}</p>}
              {children}
            </div>
            {action}
          </div>
        </div>
      </div>

      {/* Focus ring for keyboard users, drawn around the whole folder. */}
      {href && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-3xl ring-white/80 group-has-[a:focus-visible]:ring-2"
        />
      )}
    </article>
  );
}

// The same folder look for content of any length (e.g. a journal entry): the
// pocket grows with its content and the paper peeks out above it.
export function FolderPanel({
  paper = 0,
  children,
  className = "",
}: {
  paper?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`group relative isolate pt-16 ${className}`}>
      <div aria-hidden className="absolute inset-x-0 top-5 bottom-0 rounded-3xl bg-white/25 backdrop-blur-md" />
      <div aria-hidden className="absolute top-0 right-6 h-6 w-2/5 rounded-t-2xl bg-white/25 backdrop-blur-md" />
      <div
        aria-hidden
        className={`absolute inset-x-3 top-7 bottom-6 overflow-hidden rounded-2xl bg-gradient-to-br ${PAPERS[paper % PAPERS.length]} transition-transform duration-300 ease-out group-hover:-translate-y-2 motion-reduce:transition-none`}
      >
        <div className="absolute inset-0 bg-[repeating-linear-gradient(115deg,rgb(255_255_255/0.22)_0_5px,transparent_5px_22px)]" />
      </div>
      <div className="relative">
        <div aria-hidden className="absolute -top-4 left-0 h-6 w-2/5 rounded-t-2xl bg-white/85 backdrop-blur-xl" />
        <div className="relative rounded-3xl rounded-tl-none bg-white/85 p-5 text-neutral-900 shadow-xl shadow-black/20 backdrop-blur-xl sm:p-6">
          {children}
        </div>
      </div>
    </article>
  );
}

// Round dark button like the folder's "+" in the original design. Decorative:
// the whole folder is already the link.
export function FolderAction({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden
      className="grid size-11 shrink-0 place-items-center rounded-full bg-neutral-900 text-lg text-white shadow-lg shadow-black/30 transition-transform group-hover:scale-105"
    >
      {children}
    </span>
  );
}
