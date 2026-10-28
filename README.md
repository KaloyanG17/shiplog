# Shiplog (working name)

> **Plan → Code → Log → Share.** A personal dev board that watches your GitHub, writes your work journal for you, and turns finished work into a public roadmap and changelog.

**Status:** 🚧 Starter project set up: Next.js, Tailwind, Prisma + Postgres, GitHub login. See [Getting started](#getting-started).

---

## The problem

As a solo developer I:

- keep tasks in one place, code in GitHub, and notes somewhere else (or nowhere)
- forget what I did last week when it's time for a standup, a review or updating my CV
- rarely share progress on side projects, because writing changelogs and updates takes time

## The idea

One app that closes the loop, using GitHub activity as the source of truth:

```
   ┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
   │  1. PLAN   │ ──▶ │  2. CODE   │ ──▶ │  3. LOG    │ ──▶ │  4. SHARE  │
   │ Kanban     │     │ GitHub     │     │ AI journal │     │ Public     │
   │ board      │     │ (as usual) │     │ & summary  │     │ roadmap +  │
   └────────────┘     └────────────┘     └────────────┘     │ changelog  │
         ▲                                                  └─────┬──────┘
         └──────────── feedback & votes feed back into planning ──┘
```

### 1. Plan: personal kanban board
- Board per project with columns (Backlog → To do → In progress → In review → Done)
- GitHub issues sync in as cards; private to-dos can sit next to them
- Drag and drop, labels, Markdown descriptions

### 2. Code: GitHub drives the board
- Work in GitHub as normal; webhooks update the board automatically:
  - PR opened that references an issue → card moves to **In review**
  - PR merged / issue closed → card moves to **Done**
- Commits, PRs and issues are stored as events for the journal

### 3. Log: auto-written dev journal
- Every evening the day's GitHub activity is collected and Claude writes a **draft journal entry** (what I worked on, what shipped, what's still open)
- I can edit, add notes ("got stuck on X", "learned Y") and save it
- **Weekly summary** for standups, performance reviews or CV bullet points
- Full-text search across all entries

### 4. Share: public project page
- Each project can be made public at `/p/<project-slug>`
- **Changelog** made from merged PRs and published journal entries
- **Public roadmap** showing planned cards; visitors can upvote features
- Votes and feedback flow back into the board → back to step 1

---

## Scope

### MVP (v1): finish this first
- [ ] Sign in with GitHub; install the GitHub App on chosen repos
- [ ] Board per repo, with issue → card sync
- [ ] Webhooks that move cards on PR / issue events
- [ ] Daily AI journal draft that I can edit and save
- [ ] Public changelog page per project

### Later (v2+)
- [ ] Public roadmap with upvotes
- [ ] Weekly / monthly summaries and "export as CV bullets"
- [ ] Multiple repos per project
- [ ] Pomodoro timer per card + focus stats (heatmap, estimate vs actual)
- [ ] Split the API out into a NestJS service in an Nx monorepo
- [ ] Mobile app (Ionic/Capacitor or React Native)

---

## Planned tech stack

| Area | Choice |
|---|---|
| Language | TypeScript everywhere |
| Framework | Next.js (App Router): React UI, API routes, server-rendered public pages |
| Styling | Tailwind CSS |
| State | Zustand (client), Server Components / Server Actions |
| Database | PostgreSQL (Neon or Supabase) + Prisma |
| Auth | Auth.js with GitHub |
| GitHub | GitHub App (per-repo permissions + webhooks) via Octokit |
| AI | Claude API for journal drafts and summaries |
| Scheduled jobs | Vercel Cron (daily summary job) |
| Validation | Zod |
| Testing | Vitest (unit), Playwright (end-to-end) |
| CI/CD | GitHub Actions → deploy on Vercel |

## Architecture (first draft)

```
GitHub ──webhook──▶ /api/github/webhook ──▶ check signature ──▶ save GithubEvent
                                                     │
                                                     └──▶ update Card column

Vercel Cron (daily) ──▶ /api/cron/journal ──▶ group the day's events per user
                                                 ──▶ Claude API ──▶ JournalEntry (draft)

Browser ──▶ Next.js app (private: board, journal)
Visitors ──▶ /p/<slug> (public, server-rendered: changelog, roadmap)
```

## Data model (first pass)

| Model | Key fields |
|---|---|
| `User` | id, githubId, name, email |
| `Installation` | GitHub App installation id, userId |
| `Repo` | githubRepoId, fullName, installationId |
| `Project` | name, slug, isPublic, repos |
| `Card` | title, description, column, position, githubIssueId? |
| `GithubEvent` | type (push / pull_request / issues), payload, repoId, occurredAt |
| `JournalEntry` | date, aiDraft, content, status (draft / published) |
| `ChangelogItem` | projectId, title, body, source (PR / journal), publishedAt |
| `RoadmapVote` *(v2)* | cardId, voterHash, createdAt |

---

## What this project shows (for my CV)

- **TypeScript full-stack** with Next.js and React
- **Third-party integrations:** GitHub App, OAuth, REST API, verified webhooks
- **Keeping two systems in sync** (GitHub ⇄ board)
- **Background / scheduled jobs**
- **Practical AI feature** using the Claude API
- **Public vs private access** to the same data, SEO-friendly server rendering
- **Relational data modelling** with PostgreSQL + Prisma
- **Automated testing and CI/CD** (Vitest, Playwright, GitHub Actions)

## Getting started

Requires Node.js 20+ and a PostgreSQL database (a local install, or a free one from [Neon](https://neon.tech) or [Supabase](https://supabase.com)).

1. **Install dependencies** (this also generates the Prisma client):
   ```bash
   npm install
   ```
2. **Create `.env`** by copying `.env.example`, then fill it in:
   - `DATABASE_URL`: your Postgres connection string
   - `AUTH_SECRET`: generate one with `npx auth secret`
   - `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET`: create a GitHub OAuth app at
     <https://github.com/settings/developers> with callback URL
     `http://localhost:3000/api/auth/callback/github`
3. **Create the database tables:**
   ```bash
   npm run db:migrate -- --name init
   ```
4. **Start the app** and open <http://localhost:3000>:
   ```bash
   npm run dev
   ```

### GitHub App (for connecting repos)

Login uses the OAuth app above. Reading repos uses a separate **GitHub App**, so you choose exactly which repos Shiplog can see.

1. Go to <https://github.com/settings/apps> → **New GitHub App**:
   | Field | Value |
   |---|---|
   | GitHub App name | must be unique on GitHub, e.g. `Shiplog <your-name> dev` |
   | Homepage URL | `http://localhost:3000` |
   | Callback URL / "Request user authorization during installation" | leave empty / unticked |
   | Setup URL | `http://localhost:3000/api/github/setup`, and tick **Redirect on update** |
   | Webhook → Active | **untick** for now (webhooks come in a later feature) |
   | Repository permissions | Contents, Issues, Pull requests: **Read-only** (Metadata is added automatically) |
   | Where can this GitHub App be installed? | Only on this account |
2. After creating it, note the **App ID** and the **slug** (the end of the app's public URL, `github.com/apps/<slug>`).
3. Under **Private keys**, click **Generate a private key**. A `.pem` file downloads.
4. Fill in `GITHUB_APP_ID`, `GITHUB_APP_SLUG` and `GITHUB_APP_PRIVATE_KEY` in `.env`. The key must be on one line with each line break written as `\n`.
5. Restart `npm run dev`, open the dashboard and click **Connect GitHub repos**.

### Webhooks (GitHub → Shiplog)

GitHub can't reach `localhost`, so in development webhooks go through a [smee.io](https://smee.io) channel. `npm run webhooks:dev` forwards them to `/api/github/webhook`.

1. Set `GITHUB_WEBHOOK_SECRET` and `SMEE_URL` in `.env` (see `.env.example`).
2. In the GitHub App settings (<https://github.com/settings/apps> → your app → **General**):
   - **Webhook → Active:** ticked
   - **Webhook URL:** your `SMEE_URL`
   - **Webhook secret:** the same value as `GITHUB_WEBHOOK_SECRET`
3. Under **Permissions & events → Subscribe to events**, tick **Issues**, **Pull request** and **Push**. Installation events are always sent.
4. Run the app and the tunnel in two terminals:
   ```bash
   npm run dev
   ```
   ```bash
   npm run webhooks:dev
   ```

What happens to each event:
| Event | Effect |
|---|---|
| `issues`, `pull_request`, `push` | Saved to `GithubEvent` for the repo (duplicate deliveries are ignored) |
| `installation_repositories` | Repos added/removed on GitHub are added/removed in Shiplog |
| `installation.deleted` | The installation and its repos are removed |

Requests without a valid `X-Hub-Signature-256` get `401`. Recent deliveries (and a **Redeliver** button) are in the app settings under **Advanced**.

> smee.io channels are public: anyone with the URL can watch the events passing through. Fine for development; in production GitHub calls your deployed URL directly.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / run it |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript checks |
| `npm run db:migrate` | Create and apply a database migration after changing `prisma/schema.prisma` |
| `npm run db:studio` | Browse the database in Prisma Studio |

### Project structure

```
prisma/schema.prisma        Database models (Auth.js + Shiplog)
prisma.config.ts            Prisma CLI config (reads DATABASE_URL)
src/auth.ts                 Auth.js setup: GitHub provider + Prisma adapter
src/lib/db.ts               Shared Prisma client
src/app/page.tsx            Landing page
src/app/login/              Sign-in page
src/app/dashboard/          Signed-in area (redirects to /login when signed out)
src/app/api/auth/           Auth.js routes
src/components/             Sign-in/out buttons, user menu
```

> **Note:** Next.js 16 has Cache Components switched on. Any component that reads the session (`auth()`), cookies or headers must be rendered inside `<Suspense>`, like `UserMenu` in the layout and `Dashboard` in the dashboard page.

## Next steps

1. Write user stories for the MVP features
2. ~~Create the Next.js project, add Prisma + Postgres, and get GitHub login working~~ ✅
3. ~~Register the GitHub App and connect repos as projects~~ ✅
4. ~~Receive webhooks locally (smee.io tunnel) and store them as events~~ ✅
5. Build the board UI, the issue → card sync and auto-moving cards
6. Add the daily journal job
7. Add the public changelog page, deploy, and write tests
