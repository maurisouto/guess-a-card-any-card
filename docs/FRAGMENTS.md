# Fragments of Rathe — guía técnica

Experiencia de **puzzles** con cartas FAB (modo *fragment* y *sliding*). Aislada de Guess en rutas, API, estadísticas y leaderboards.

---

## Rutas y navegación (web)

| Ruta | Propósito |
|------|-----------|
| `/puzzle` | Lobby + juego (`FragmentsPlayClient`) |
| `/puzzle/profile` | Archivo personal (auth) |
| `/puzzle/leaderboard` | Hall of records |
| `/u/[userId]/puzzle` | Perfil público |

**Header** (`fragments-header.tsx`): Codex (`/`), Play (`/puzzle`), Hall of records, **Your archive** (solo si hay sesión). En `<md`: segunda fila de links + `MobileNav` con grupos Fragments/Codex.

**Entry rail** (`fragments-puzzle-entry-rail.tsx`): en fase setup, encima del panel de configuración — copy de viaje, preview ligero del perfil si hay sesión, enlaces a Hall y archivo.

**Marca:** `getBrandFromPathname()` → `"fragments"` para paths bajo `/puzzle` y `/u/.../puzzle`.

---

## API

Base: `/api/fragments` (montado en `fragments-routes.ts`).

### Completions

- `POST /completions` — body validado por `parseFragmentsCompletionInput`.
- Actor `user` persiste; `guest` → `{ persisted: false }`.
- Idempotencia: `runId` único; reenvío mismo usuario OK.

### Perfil

- `GET /profile/me` — auth obligatoria.
- `GET /profile/:userId` — público.

Respuesta incluye (entre otros): `summary`, `recentCompletions`, `highlights`, `setProgress`, `modeBreakdown`, `difficultyBreakdown`, `cardHighlights`, `bestRuns`.

Agregación pesada: `getFragmentsProfileByUserId` en `fragments-service.ts` + helpers en `fragments-profile-aggregate.ts`. Progreso por set usa **`getPlayablePrintingCountBySet()`** del catálogo (misma pool que random deal).

### Leaderboards

- `GET /leaderboards?category=&mode=&difficulty=&limit=&offset=`

| `category` | Ranking |
|------------|---------|
| `fastest` | Mejor **run** por `timeMs` (tie: moves, `completedAt`) |
| `fewest_moves` | Mejor **run** por `moves` |
| `most_restorations` | Usuario por COUNT completions filtradas |
| `most_unique_cards` | Usuario por COUNT DISTINCT `cardId` |

Filtros: `mode` = `all` \| `fragments` \| `sliding`; `difficulty` = `all` \| `easy` \| `normal` \| `hard`.

Validez mínima (v1): `timeMs` ∈ [500, 86400000], `moves` ≥ 1. **Sin anti-cheat** — datos enviados por el cliente.

Implementación: `fragments-leaderboard-service.ts`.

---

## Persistencia (Prisma)

Modelos principales:

- `FragmentsCompletion` — una fila por run guardado.
- `UserFragmentsStat` — agregados por usuario (counts, bests, totals).
- `UserFragmentsCardStat` — por `cardId`.

**No rediseñar** estos modelos sin migración explícita y plan de datos.

---

## Frontend (features)

```
apps/web/src/features/fragments/
  engine/          # Lógica puzzle (fragment + sliding), tests
  components/      # UI juego, setup, leaderboard, HUD, …
  hooks/           # use-fragments-puzzle-game.ts (estado + POST completion)
  lib/             # fragments-catalog.ts (deal carta vía API catálogo)
```

Cliente API: `apps/web/src/lib/fragments/fragments-api.ts`  
Tipos: `apps/web/src/lib/fragments/types.ts`

---

## Fases de producto (referencia)

| Fase | Estado típico | Alcance |
|------|---------------|---------|
| Gameplay + UI | Hecho | Setup, modos, resultado, guest vs auth save |
| 5 Persistencia | Hecho | POST completion, stats, perfiles básicos |
| 5.5 Stats perfil | Hecho | Set progress, highlights, breakdowns |
| 6 Leaderboards | Hecho | API + `/puzzle/leaderboard` |
| 6.5 Navegación | Hecho | Header, rail, cross-links, mobile |
| 7+ (futuro) | — | Share, daily, verificación servidor, etc. |

Al implementar una fase nueva, leer el brief de la fase y **no** expandir alcance (p. ej. fase de stats ≠ leaderboards).

---

## Tests

- API: `fragments-service.test.ts`, `fragments-profile-aggregate.test.ts`, `fragments-leaderboard-service.test.ts`, `fragments-http.test.ts`, `fragments-leaderboards-http.test.ts`
- Web: `persistence-wiring.test.ts`, `fragments-navigation-wiring.test.ts`, `fragments-leaderboard-page-source.test.ts`, `engine/*.test.ts`

---

## Restricciones habituales (para agentes)

- No cambiar lógica de **Guess** leaderboard ni `UserStat`.
- No mezclar rankings Guess/Fragments en una sola UI.
- No añadir gameplay no pedido en fases de stats/navegación.
- Mantener tono visual: verde arcane, archivo, sin dashboard esports.
