# Traspaso del repositorio — Guess a Card, Any Card

Documento principal para **continuar el desarrollo** tras transferir el repo a otro usuario u organización. Léelo antes de abrir Cursor o desplegar.

**Última actualización orientativa:** junio 2026 (post Fases 5.5–6.5 de *Fragments of Rathe*).

---

## 1. Qué es este proyecto

Monorepo npm con **tres experiencias de producto** bajo una cuenta (Supabase Auth cuando está configurado):

| Experiencia | Rutas web | Marca (`experience-brand`) | Descripción |
|-------------|-----------|----------------------------|-------------|
| **Codex of Rathe** | `/`, `/profile`, `/u/[userId]` | `codex` | Hub: enlaces a Guess y Fragments; perfil global. |
| **Guess the Card** | `/guess`, `/single`, `/challenge`, `/coop`, `/competitive`, `/leaderboard`, `/stats`, … | `guess` | Adivinar cartas ofuscadas (reveal por pasos). |
| **Fragments of Rathe** | `/puzzle`, `/puzzle/profile`, `/puzzle/leaderboard`, `/u/[userId]/puzzle` | `fragments` | Puzzles (fragmentos + sliding) con arte del catálogo FAB. |

- **Front:** `apps/web` — Next.js 16 (ver reglas de agente: no asumir APIs de Next 14).
- **API:** `apps/api` — Hono, Prisma 7, PostgreSQL.
- **Compartido:** `packages/shared` — reveal, protocolo co-op, tipos.

**Fuente de cartas:** paquete `@flesh-and-blood/cards`; el catálogo se construye **en memoria al arrancar la API** (`initCardCatalog()`). No hay tablas `Puzzle` en DB.

---

## 2. Arranque rápido (nuevo entorno)

### Requisitos

- Node **≥ 20.9**
- PostgreSQL accesible (`DATABASE_URL`)
- Opcional: proyecto Supabase (Auth + DB)

### Comandos

```bash
git clone <url-del-repo>
cd guess-a-card-any-card
npm install
cp .env.example .env   # completar DATABASE_URL y, si aplica, Supabase
npm run db:deploy      # aplica migraciones en apps/api/prisma
```

**Desarrollo recomendado (dos terminales):**

```bash
# Terminal A — API (puerto 8787 por defecto)
npm run dev:api

# Terminal B — Web (proxy /api → 8787 en dev automático)
npm run dev
```

- Health: `GET http://127.0.0.1:8787/api/health`
- Sin API, el front no tiene datos reales de juego.

### Variables de entorno

Plantilla: **`.env.example`** (raíz; la API también lee `apps/api/.env` si existe).

| Variable | Dónde | Uso |
|----------|--------|-----|
| `DATABASE_URL` | API | Postgres / Supabase |
| `SUPABASE_URL` / `SUPABASE_JWKS_URL` | API | Validar JWT de usuario |
| `NEXT_PUBLIC_SUPABASE_*` | Web | Login en navegador |
| `CORS_ORIGIN` | API prod | Origen del front (Vercel) |
| `API_PROXY_TARGET` | Web prod | URL base de la API (sin `/api`) |
| `COOP_REALTIME_*` | API + proceso WS | Co-op en tiempo real (opcional) |

Detalle de deploy: **[deploy.md](./deploy.md)**.

---

## 3. Arquitectura (resumen)

```
apps/web (Next)  ──rewrite /api/*──►  apps/api (Hono :8787)
                                         │
                                         ├── Prisma → PostgreSQL
                                         └── Catálogo FAB (memoria, boot)
```

- **Guess leaderboard:** `/api/leaderboard` — **no mezclar** con Fragments.
- **Fragments:** `/api/fragments/*` — persistencia y rankings propios.
- **Invitado:** header `x-guest-id`; usuario: `Authorization: Bearer <jwt>`.

Mapa más detallado: **[ARCHITECTURE.md](./ARCHITECTURE.md)**.  
Visión de producto histórica (algunas secciones obsoletas): **[BLUEPRINT_PRO.md](./BLUEPRINT_PRO.md)** — prevalece **§0.1** del blueprint sobre “puzzle DB”.

---

## 4. Base de datos y migraciones

- **Dueño de migraciones:** este repo (`apps/api/prisma`).
- **Aplicar en deploy/local:** `npm run db:deploy`.
- **Generar cliente:** `npm run db:generate` → `apps/api/src/generated/prisma` (gitignored).

Migraciones recientes relevantes para Fragments:

- `20260509004000_fragments_persistence_stats` — completions + stats agregados.
- `20260509120000_fragments_leaderboard_indexes` — índices para leaderboards.

Política completa: **[database.md](./database.md)**.

**Nota sobre `image-guess-admin`:** el README antiguo mencionaba un admin compartiendo DB. La arquitectura actual (**database.md**, blueprint §0.1) indica que el **admin no forma parte** del gameplay ni de esta base. Si existe un repo admin legacy, **no** debe divergir migraciones contra la misma DB sin acuerdo explícito.

---

## 5. Fragments of Rathe — estado implementado

Experiencia **independiente** de Guess (rutas, API, leaderboards, UI verde/archivo).

### Rutas web

| Ruta | Componente principal |
|------|----------------------|
| `/puzzle` | `FragmentsPlayClient` + setup / juego |
| `/puzzle/profile` | `FragmentsProfilePageClient` |
| `/puzzle/leaderboard` | `FragmentsLeaderboardClient` — *Hall of records* |
| `/u/[userId]/puzzle` | `FragmentsPublicProfileClient` |

### API (`/api/fragments`)

| Método | Ruta | Notas |
|--------|------|--------|
| POST | `/completions` | Usuario autenticado; idempotente por `runId` |
| GET | `/profile/me` | Requiere auth |
| GET | `/profile/:userId` | Público |
| GET | `/leaderboards` | Query: `category`, `mode`, `difficulty`, `limit`, `offset` |

### Fases completadas (referencia)

| Fase | Contenido |
|------|-----------|
| 5 | Persistencia completions + `UserFragmentsStat` + perfiles |
| 5.5 | Perfil rico: resumen, breakdowns, progreso por set, highlights, actividad reciente |
| 6 | Leaderboards (fastest, fewest_moves, most_restorations, most_unique_cards) + filtros |
| 6.5 | Navegación: header Play / Hall / Your archive, entry rail en `/puzzle`, mobile Fragments |

Detalle técnico Fragments: **[FRAGMENTS.md](./FRAGMENTS.md)**.

### Qué **no** está hecho (Fragments)

- Verificación servidor del puzzle (completions confían en el cliente — ver comentario en `fragments-service.ts`).
- Share URLs, daily puzzle, multiplayer Fragments.
- Anti-cheat serio.

### Terminología acordada (UI)

- **Restorations** / **restore** — preferir sobre “run/game/match” mezclados.
- **Hall of records** — leaderboards (`/puzzle/leaderboard`).
- **Your archive** — perfil propio (`/puzzle/profile`).
- **Start puzzle** — CTA principal en setup (no sustituir por “Play game”).

---

## 6. Guess — no tocar sin intención

- Leaderboard Guess: `/leaderboard` (web) + `/api/leaderboard` (API).
- Perfiles Guess: `/guess/profile`, `/u/[id]/guess`.
- Al trabajar en Fragments: **no** refactorizar stats Guess ni mezclar rankings.

---

## 7. Pruebas

Desde la raíz:

```bash
npm test                    # Vitest: web + api + shared (proyectos en vitest.config.ts)
cd apps/web && npx tsc --noEmit
cd apps/api && npx tsc --noEmit
```

Tests de cableado Fragments (sin RTL): `apps/web/src/features/fragments/*-wiring.test.ts`, `*-source.test.ts`.

---

## 8. Trabajar con Cursor / agentes

1. Leer **`AGENTS.md`** (reglas del repo para el asistente).
2. Antes de código Next.js: guías en `node_modules/next/dist/docs/` (Next **16**, breaking changes).
3. Convenciones: cambios **mínimos**, reutilizar patrones del archivo vecino, no sobre-ingeniería.
4. **No** crear commits ni PR salvo que el usuario lo pida.
5. Fases Fragments futuras: respetar límites de cada fase (ver FRAGMENTS.md).

---

## 9. Despliegue (checklist nuevo maintainer)

1. Postgres con migraciones aplicadas (`db:deploy` en build API).
2. API en Render/Netlify con `DATABASE_URL`, `CORS_ORIGIN`, Supabase JWKS si hay auth.
3. Vercel (web) con `API_PROXY_TARGET` apuntando a la API.
4. Supabase: URLs de callback `.../auth/callback` en Authentication.
5. Tras deploy API: reinicio carga catálogo FAB (si falla boot, no hay cartas).

---

## 10. Archivos “mapa” útiles

| Área | Ubicación |
|------|-----------|
| Rutas API | `apps/api/src/server/http-app.ts` |
| Fragments servicio | `apps/api/src/server/services/fragments-service.ts` |
| Fragments leaderboards | `apps/api/src/server/services/fragments-leaderboard-service.ts` |
| Catálogo FAB | `apps/api/src/server/services/card-catalog-service.ts` |
| Marca por ruta | `apps/web/src/lib/experience-brand.ts` |
| Header Fragments | `apps/web/src/components/layout/fragments-header.tsx` |
| Motor puzzle (client) | `apps/web/src/features/fragments/engine/` |
| Tipos Fragments API | `apps/web/src/lib/fragments/types.ts` |
| Esquema Prisma | `apps/api/prisma/schema.prisma` |

---

## 11. Problemas frecuentes

| Síntoma | Causa probable | Acción |
|---------|----------------|--------|
| `/api/*` 404 en dev | API no corre | `npm run dev:api` |
| Catálogo vacío / crash API | FAB filters o paquete | Logs al boot; ver `card-catalog-service` |
| Migraciones fallan | `DATABASE_URL` pooler | Usar conexión directa Supabase (ver `.env.example`) |
| Auth no guarda Fragments | Guest o JWT inválido | Sign in; header `Authorization` |
| CORS en prod | Falta `CORS_ORIGIN` | Configurar en API o usar proxy Vercel |
| Prisma client missing | No generate | `npm run db:generate` |

---

## 12. Próximos pasos sugeridos (producto)

1. **Fragments:** deep links Hall → filtros; “tu posición” en leaderboard; opcional verificación de puzzle en servidor.
2. **Guess:** seguir roadmap en BLUEPRINT_PRO (modos ya parcialmente implementados).
3. **Auth:** alinear `users.id` con `auth.users.id` si aún hay desvíos.
4. **Co-op WS:** documentar host de `realtime:dev` en prod si se usa.

---

## 13. Contacto y continuidad

Al recibir el repo:

1. Clonar, `npm install`, `.env`, `db:deploy`.
2. Leer este archivo + **FRAGMENTS.md** + **ARCHITECTURE.md**.
3. Ejecutar `npm test` y smoke manual: `/`, `/puzzle`, `/puzzle/profile`, `/puzzle/leaderboard`.
4. Revisar `git status` / ramas abiertas y PRs pendientes del equipo anterior.

Si el traspaso incluye **secretos** (Supabase, Render, Vercel), rotarlos fuera de git y actualizar solo en los paneles de hosting — nunca commitear `.env`.
