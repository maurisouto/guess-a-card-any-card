# Guess a Card, Any Card

Monorepo for **Codex of Rathe** (hub), **Guess the Card** (veiled FAB card guessing), and **Fragments of Rathe** (card puzzles).  
Card content comes from **`@flesh-and-blood/cards`** via an in-memory catalog loaded at API startup.

> **Nuevo maintainer / otro Cursor:** empezá por **[docs/HANDOFF.md](./docs/HANDOFF.md)** (traspaso, setup, mapa del producto).  
> Agentes: **[AGENTS.md](./AGENTS.md)** · Arquitectura: **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** · Fragments: **[docs/FRAGMENTS.md](./docs/FRAGMENTS.md)**

## Monorepo

| Package | Role | Deploy típico |
|---------|------|----------------|
| `apps/web` | Next.js UI | **Vercel** |
| `apps/api` | Hono + Prisma + REST `/api/*` | **Render** / Netlify Functions |
| `packages/shared` | Tipos compartidos (reveal, co-op WS) | (no se despliega solo) |

Artefactos generados: **[docs/generated-files.md](./docs/generated-files.md)**.

## Experiencias (rutas principales)

| Experiencia | Rutas | API |
|-------------|-------|-----|
| Codex (hub) | `/`, `/profile`, `/u/[userId]` | `/api/profile`, … |
| Guess | `/guess`, `/single`, `/challenge`, `/coop`, `/competitive`, `/leaderboard`, `/stats` | `/api/single`, `/api/challenges`, `/api/leaderboard`, … |
| Fragments | `/puzzle`, `/puzzle/profile`, `/puzzle/leaderboard` | `/api/fragments/*` |

## Setup local

```bash
npm install
cp .env.example .env    # DATABASE_URL; Supabase si usás auth — ver comentarios
npm run db:deploy       # migraciones (workspace @gac/api)
```

**Solo front** (sin API, no hay datos reales):

```bash
npm run dev --workspace=@gac/web
```

**API + front** (recomendado):

```bash
# Terminal A
npm run dev:api

# Terminal B
npm run dev
```

En desarrollo, Next reenvía `/api/*` a `http://127.0.0.1:8787` por defecto. Override: `API_PROXY_TARGET` en `apps/web/.env.local`.

**Prisma:** esquema en `apps/api/prisma`. Cliente generado en `apps/api/src/generated/prisma` (gitignored). `prisma generate` puede correr sin DB vía `apps/api/prisma.config.ts`.

## Database & migrations

Este repositorio **es la fuente de verdad** de migraciones Prisma para la base del juego.

```bash
npm run db:deploy
```

Política y modelo catálogo-en-runtime: **[docs/database.md](./docs/database.md)**.

## Deploy

Front **Vercel**, API **Render** o **Netlify**, variables y proxy: **[docs/deploy.md](./docs/deploy.md)**.

## Scripts (raíz)

| Script | Purpose |
|--------|---------|
| `npm run dev` / `dev:web` | Next en `apps/web` |
| `npm run dev:api` | Hono en `apps/api` (puerto 8787 o `PORT`) |
| `npm run build` / `start` | Build y `next start` del web |
| `npm run start:api` | API en producción |
| `npm run lint` | ESLint del web |
| `npm test` | Vitest (web + api + shared) |
| `npm run db:*` | Prisma vía workspace `@gac/api` |
| `npm run realtime:dev` | Servidor WS co-op (workspace API) |

## Documentación

| Documento | Contenido |
|-----------|-----------|
| [docs/HANDOFF.md](./docs/HANDOFF.md) | **Traspaso / onboarding** |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Arquitectura técnica |
| [docs/FRAGMENTS.md](./docs/FRAGMENTS.md) | Fragments of Rathe |
| [docs/BLUEPRINT_PRO.md](./docs/BLUEPRINT_PRO.md) | Visión de producto (§0.1 = modelo actual) |
| [docs/deploy.md](./docs/deploy.md) | Hosting |
| [docs/database.md](./docs/database.md) | Postgres y migraciones |
| [AGENTS.md](./AGENTS.md) | Instrucciones para Cursor / agentes |

## Learn more

- [Next.js Documentation](https://nextjs.org/docs) — este proyecto usa **Next 16**; ver también `node_modules/next/dist/docs/`.
