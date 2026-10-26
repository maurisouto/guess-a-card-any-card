# Agent instructions — Guess a Card, Any Card

Read this file before making changes. **`CLAUDE.md`** points here.

## Onboarding (new maintainer or new Cursor workspace)

1. **[docs/HANDOFF.md](./docs/HANDOFF.md)** — traspaso del repo, setup, Fragments vs Guess, checklist (Spanish, primary).
2. **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** — monorepo, routes, catalog, auth (English).
3. **[docs/FRAGMENTS.md](./docs/FRAGMENTS.md)** — Fragments API, phases, files, constraints.

## Next.js (required)

This is **not** classic Next.js 14. APIs and conventions may differ.

Before writing or changing Next code, read the relevant guide under:

`node_modules/next/dist/docs/`

Heed deprecation notices in the codebase.

## Monorepo

| Package | Role |
|---------|------|
| `apps/web` | Next.js UI (`@gac/web`) |
| `apps/api` | Hono + Prisma (`@gac/api`), port 8787 default |
| `packages/shared` | Shared types, reveal, coop protocol (`@gac/shared`) |

Local dev: **`npm run dev:api`** + **`npm run dev`** (web proxies `/api` to API in development).

## Product boundaries (do not blur)

- **Codex** — hub `/`, global profile `/profile`.
- **Guess** — veiled card guessing; leaderboard at `/leaderboard` and `/api/leaderboard`.
- **Fragments** — puzzles at `/puzzle/*`; API `/api/fragments/*`; **separate** leaderboards and stats.

When a task says “Fragments only”, do **not** change Guess leaderboard, Guess profile stats, or Codex-wide rankings.

## Database

- Migrations live in **`apps/api/prisma`** only.
- Apply: `npm run db:deploy` from repo root.
- Card data comes from **`@flesh-and-blood/cards`** at API boot — not from puzzle tables.

See [docs/database.md](./docs/database.md).

## Code style (user rules)

- **Minimal diffs** — fix what was asked; no drive-by refactors.
- **Match surrounding code** — naming, imports, patterns in neighboring files.
- **Avoid over-engineering** — no extra abstractions for one-off logic.
- **Comments** only for non-obvious business rules.
- **Tests** when they add real coverage; skip trivial assertions.
- **Do not commit** unless the user explicitly asks.

## Commands

```bash
npm install
npm run dev:api          # API
npm run dev              # Web
npm test                 # vitest (web + api + shared)
npm run db:deploy        # migrations
cd apps/web && npx tsc --noEmit
cd apps/api && npx tsc --noEmit
```

## Fragments terminology (UI copy)

Prefer: **restoration(s)**, **Hall of records**, **Your archive**, **Start puzzle**, **Return to restorations**.

Avoid mixing puzzle / game / run / match inconsistently in Fragments surfaces.

## Phase work (Fragments)

If the user references “Phase N”, read [docs/FRAGMENTS.md](./docs/FRAGMENTS.md) for scope. Typical out-of-scope items unless requested: Guess changes, leaderboard merge, persistence redesign, server-side puzzle verification, share system, daily puzzle.

## Deploy / env

Template: `.env.example`. Hosting: [docs/deploy.md](./docs/deploy.md).
