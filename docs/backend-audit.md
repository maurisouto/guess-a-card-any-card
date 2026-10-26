# Codex of Rathe — Comprehensive Backend Audit

**Audit scope:** current `main` at `d3a259a`  
**Audit mode:** analysis only; no application code, schema, branch, commit, deploy, or infrastructure was changed.  
**Audit date:** 2026-10-26

## 1. Executive summary

The backend has a solid incremental architecture: Hono routes are separated from services, Prisma owns persistence, game state is snapshot-based, terminal Guess statistics are intended to be idempotent, and the HTTP API plus co-op WebSocket share one Node process. The recent room-start guards and unique active-guest index materially reduce duplicate room transitions.

No confirmed Critical vulnerability was demonstrated during this static review. The most important production risks are High severity:

1. Terminal statistics idempotency is implemented as a read-then-apply-then-mark sequence without an atomic claim or row lock. Concurrent terminal paths can apply user statistics more than once.
2. Co-op and Competitive room creation persist the `Room` and host `RoomPlayer` in separate operations. A partial failure can leave an unusable room.
3. Several identity invariants are documented but not enforced by PostgreSQL. Invalid rows can be inserted by a future code path, a maintenance script, or a migration/import.
4. The WebSocket hub has no heartbeat, stale-connection eviction, send backpressure policy, subscription failure close, or per-connection message limit. HTTP polling remains a valid fallback, but the realtime layer can accumulate unreliable or expensive connections.
5. Input validation is materially stronger for Fragments than for Guess multiplayer routes. Guess room names, set arrays, guess text, and timing values are only partially bounded at the route boundary.

The recommended approach is incremental: first make terminal aggregation and room creation atomic, then add database invariants and focused integration tests, then harden WebSocket lifecycle and request validation. No rewrite or new infrastructure is required.

The audit command `npm test` was attempted, but this environment returned `zsh: operation not permitted: npm` before Vitest started. Therefore this report does not claim a fresh test pass. Existing test files were inspected statically.

## 2. Current backend architecture

- `apps/api` exposes a Hono application rooted at `/api`. The route composition is in `apps/api/src/server/http-app.ts:17-52`.
- `apps/api/src/server/node-server.ts:12-15` creates one Node HTTP server from Hono's fetch listener and attaches the co-op WebSocket hub to the same server.
- Co-op realtime state is held in process memory in `apps/api/src/server/realtime/coop-realtime.ts:25-140`, while the source of truth remains PostgreSQL through `getCoopRoomPublic`.
- Domain responsibilities are mostly split into `coop-service.ts`, `competitive-service.ts`, `single-player-service.ts`, `fragments-service.ts`, leaderboard services, and a stats repository.
- The card catalog is built in memory at API module initialization (`apps/api/src/server/http-app.ts:17`), and games persist card/reveal snapshots in `apps/api/prisma/schema.prisma:162-204`.
- Authentication resolves either a Supabase JWT or a guest header in `apps/api/src/server/auth/resolve-actor.ts:34-75`. Fragments persistence intentionally accepts registered users only (`fragments-service.ts:217-223`).
- The global protection middleware is process-local and applied before CORS (`apps/api/src/server/http-app.ts:27-35` and `apps/api/src/server/api-protection.ts:79-121`).

### Product boundary observations

Guess, Competitive, Co-op, Challenges, and Fragments share the same Prisma database but use different service paths and different trust models. Guess multiplayer currently uses guest identities, while single-player and Fragments also resolve Supabase users. This is a valid product choice, but it means fixes must not assume all game modes have the same authorization or statistics behavior.

## 3. Findings by severity

### Critical

No confirmed Critical finding was established from the inspected code. The High findings below should nevertheless be treated as production blockers until covered by database-backed concurrency tests.

### High

#### H-01 — Terminal statistics idempotency is not atomically claimed

**Affected files:**

- `apps/api/src/server/services/terminal-game-stats-service.ts:31-89`
- `apps/api/src/server/repositories/stats-repository.ts:114-171`
- `apps/api/prisma/schema.prisma:187-191`
- Terminal callers in `apps/api/src/server/services/single-player-service.ts:242-277`, `apps/api/src/server/services/coop-service.ts:494-545`, `apps/api/src/server/services/competitive-service.ts:64-146`, and `apps/api/src/server/services/coop-service.ts:594-656`

**Evidence:** `applyRegisteredUserStatsForTerminalGameInTx` reads `statsAggregatedAt`, returns if non-null, updates every user aggregate, then sets `statsAggregatedAt` at the end. There is no conditional `UPDATE ... WHERE stats_aggregated_at IS NULL`, row lock, or serializable transaction option. The aggregate updates themselves read current counters and write computed values.

**Impact:** Two concurrent terminal transitions can both observe `NULL`, increment the same user statistics, and both mark the game aggregated. Depending on transaction interleaving, the result can be duplicate games, incorrect averages, or lost updates. The race is especially relevant because Competitive reconciliation runs from both reads and submissions (`competitive-service.ts:279-285`, `547-560`, `679-745`) and Co-op has separate guess, leave, and host-end terminal paths.

**Recommended solution:** Atomically claim aggregation before applying it, for example with a conditional update and a transaction-safe ownership marker, or lock the game row with `FOR UPDATE` while retaining the existing transaction. Ensure only the transaction that successfully claims the marker applies aggregates. Keep the current marker for backward compatibility.

**Effort:** Medium. **Confidence:** Likely; the race is evident from the transaction protocol, but requires a real PostgreSQL concurrency test to demonstrate the exact interleaving.

**Suggested tests:** Run two terminal operations concurrently against PostgreSQL and assert one aggregate application, one `statsAggregatedAt` transition, and exactly one increment in `UserStat` and `UserCardStat`. Cover single-player forfeit vs guess, Co-op leave vs final guess, and two Competitive reconciliations.

#### H-02 — Room creation is not atomic

**Affected files:**

- `apps/api/src/server/services/coop-service.ts:86-107`
- `apps/api/src/server/services/competitive-service.ts:287-310`
- `apps/api/prisma/schema.prisma:114-160`

**Evidence:** Both `createCoopRoom` and `createCompetitiveRoom` call `room.create`, then call `roomPlayer.create` in a separate operation. There is no transaction spanning the two writes.

**Impact:** A database error, connection interruption, process crash, or constraint failure between the writes leaves a room without its host seat. Such a room may be visible by UUID but cannot be used normally. This is a data integrity issue rather than merely a response failure.

**Recommended solution:** Wrap room and initial host-player creation in one Prisma transaction and return the room id only after both writes commit. Add a database-backed test that forces the second insert to fail and verifies no room remains.

**Effort:** Small. **Confidence:** Confirmed.

**Suggested tests:** Transaction rollback on host-seat failure; successful creation returns a room with exactly one active host; duplicate retry behavior if the client retries after a timeout.

#### H-03 — Identity XOR invariants are not enforced in the database

**Affected files:**

- `apps/api/prisma/schema.prisma:7-10`, `137-159`, `238-263`
- `apps/api/prisma/migrations/20261026120000_concurrent_room_mutation_guards/migration.sql:1-22`
- Identity creation paths in `apps/api/src/server/services/single-player-service.ts:119-143` and multiplayer start paths in `coop-service.ts:234-270`, `competitive-service.ts:440-470`

**Evidence:** The schema comments say `RoomPlayer` and `GamePlayer` should have exactly one of `userId` or `guestId`, but there are no `CHECK` constraints. The latest concurrency migration adds only a partial unique index for active guest seats. The same absence exists for room host identity (`hostUserId`/`hostGuestId`).

**Impact:** A future route, data repair, or direct database writer can create rows with both identities null or both populated. Authorization lookups may then fail open or fail closed inconsistently, and statistics may attach to an unintended identity. The current application paths mostly maintain the invariant, but the database does not protect it.

**Recommended solution:** Add PostgreSQL `CHECK` constraints using `num_nonnulls(...) = 1` for active player/host records where the lifecycle permits it. Before migration, audit and repair existing invalid rows. Keep application validation for clear API errors.

**Effort:** Medium. **Confidence:** Confirmed.

**Suggested tests:** Migration-level invalid-row rejection; valid user and valid guest inserts; rejection of both-null and both-non-null combinations; behavior of historical left/deleted rows.

#### H-04 — WebSocket lifecycle is missing production safety controls

**Affected files:**

- `apps/api/src/server/realtime/coop-realtime.ts:25-140`
- `apps/api/src/server/realtime/coop-notify.ts:12-34`
- `packages/shared/src/coop-ws-protocol.ts:51-70`
- Existing coverage: `apps/api/src/server/realtime/coop-realtime.test.ts:52-103`

**Evidence:** The hub stores every subscribed socket in an in-memory room map, accepts unlimited messages, does not issue or enforce heartbeat/pong liveness, does not check `readyState` before `send`, does not define a backpressure policy, and leaves a socket registered after `getCoopRoomPublic` reports unauthorized access (`coop-realtime.ts:50-75`, `103-118`). The only realtime test covers initial snapshot and one broadcast.

**Impact:** Half-open connections can remain in memory and continue receiving database snapshots. Slow clients can cause queued writes. A client that sends repeated subscribe messages can trigger repeated database reads and move between room subscriptions. Unauthorized subscriptions produce errors but do not close the connection. This is primarily availability and resource-exhaustion risk; the current message protocol does not allow game mutations over WebSocket.

**Recommended solution:** Add a bounded subscription state machine, close on failed authentication/authorization, enforce a per-message and per-connection rate limit, add ping/pong heartbeat with stale cleanup, skip or terminate sockets that cannot keep up, and make broadcast delivery observable. Preserve HTTP polling as the fallback.

**Effort:** Medium. **Confidence:** Confirmed for missing controls; exploitability and thresholds require validation under load.

**Suggested tests:** Unauthorized subscription closes; repeated subscribe is bounded; heartbeat removes stale sockets; closed sockets are removed; slow/send-failure sockets do not block other subscribers; concurrent broadcasts preserve a documented ordering policy.

#### H-05 — Guess multiplayer input validation is weaker than Fragments validation

**Affected files:**

- `apps/api/src/server/coop-routes.ts:30-167`
- `apps/api/src/server/competitive-routes.ts:33-142`
- `apps/api/src/server/services/coop-service.ts:418-490`
- `apps/api/src/server/services/competitive-service.ts:679-740`
- Compare `apps/api/src/server/services/fragments-service.ts:138-207`

**Evidence:** Co-op and Competitive routes cast JSON bodies and only type-check selected properties. Guess text is not length-bounded at the route/service boundary, `timeTakenMs` is only checked as finite and then clamped to a minimum, and Co-op set values are not trimmed or bounded (`coop-routes.ts:75-84`). Fragments applies explicit maximum lengths, integer ranges, and proof-size limits.

**Impact:** Malformed or very large values can increase database/storage costs, produce inconsistent analytics, or create divergent behavior between clients. The global 1 MiB body limit limits one class of abuse but does not enforce business-level bounds. Negative times become zero rather than being rejected, which can hide client bugs and distort timing statistics.

**Recommended solution:** Introduce small, shared boundary validators for bounded display names, set identifiers, guess text, and non-negative integer timing. Reject invalid values with 400 instead of silently coercing them. Do not expose a broad validation framework unless the existing route surface justifies it.

**Effort:** Small to Medium. **Confidence:** Confirmed.

**Suggested tests:** Oversized and whitespace-only names/guesses; negative, fractional, NaN-like, and very large timings; invalid set identifiers; body-size and field-size interaction for both multiplayer modes.

### Medium

#### M-01 — Rate limiting is process-local and identity-spoofable at the network edge

**Affected files:**

- `apps/api/src/server/api-protection.ts:21-28`, `79-121`
- `apps/api/src/server/http-app.ts:27-35`

**Evidence:** The limiter uses an in-memory `Map`, so limits reset per process and do not coordinate across replicas. It prioritizes raw `Authorization`, `x-guest-id`, then `x-forwarded-for`/`x-real-ip`; forwarded headers are only safe when a trusted proxy strips/replaces them. The map cleanup runs periodically but has no hard entry cap. CORS runs after the protection middleware, so early 429/413 responses do not pass through the CORS middleware.

**Impact:** Multi-process deployments can be oversubscribed, clients can rotate identities, and an untrusted forwarded header can fragment buckets. Browser callers may see rate-limit responses as opaque network failures because those responses do not receive the normal CORS headers.

**Recommended solution:** Document the trusted-proxy assumption, prefer verified actor identifiers after authentication, add a bounded cleanup strategy, and decide explicitly whether process-local limits are sufficient for the intended deployment. Apply CORS consistently to rejection responses or centralize response headers.

**Effort:** Medium if distributed limiting is needed; Small for proxy/CORS hardening. **Confidence:** Confirmed for process-local behavior; deployment impact requires validation.

**Suggested tests:** Forwarded-header spoofing policy, CORS headers on 429/413, map growth under unique keys, and behavior with two server instances.

#### M-02 — Competitive room snapshots contain N+1 aggregate queries

**Affected files:**

- `apps/api/src/server/services/competitive-service.ts:613-635`
- `apps/api/src/server/services/competitive-service.ts:547-573`
- `apps/api/prisma/schema.prisma:266-286`

**Evidence:** The public room snapshot performs two database queries per `GamePlayer` (`guess.count` and `guess.aggregate`) after loading the game and guesses. The same snapshot can first call `reconcileCompetitiveGame`, which opens another transaction.

**Impact:** Polling and WebSocket broadcasts multiply database round trips by player count. This is a likely moderate-usage bottleneck, although no benchmark was available. The existing indexes help the filters but do not remove the round-trip cost.

**Recommended solution:** Reuse the already-loaded `cg.guesses` to compute counts and sums in memory, or issue one grouped aggregate query for all game players. Keep the response contract unchanged and benchmark before/after.

**Effort:** Small. **Confidence:** Confirmed code pattern; production impact requires benchmarking.

**Suggested tests:** Query-count regression test or Prisma query instrumentation; exact snapshot equivalence for zero, one, and many guesses.

#### M-03 — Leaderboard queries materialize and sort full populations

**Affected files:**

- `apps/api/src/server/services/leaderboard-service.ts:120-166`, `169-245`, `336-365`
- `apps/api/src/server/services/fragments-leaderboard-service.ts:142-187`, `222-305`
- `apps/api/prisma/migrations/20260509120000_fragments_leaderboard_indexes/migration.sql:1-10`

**Evidence:** Guess leaderboards load all qualifying rows and sort win-rate rows in application memory. Fragments supports offsets up to 50,000 and uses `OFFSET`, while aggregate leaderboards sort grouped rows before pagination. There is no keyset pagination or database-side limit for the Guess full-row path.

**Impact:** Performance and memory usage grow with registered users and completions. This is not a correctness vulnerability today, but it can become a denial-of-service vector through repeated public leaderboard requests.

**Recommended solution:** First measure query plans and response latency with representative data. Then push ordering/ranking into SQL and use bounded/keyset pagination where product semantics allow. Preserve current rank and qualification behavior with integration tests.

**Effort:** Medium. **Confidence:** Confirmed implementation; scale impact requires benchmarking.

**Suggested tests:** EXPLAIN-based performance checks, large-fixture pagination, stable tie ordering, and current-user rank correctness.

#### M-04 — Profile aggregation performs many independent queries per request

**Affected files:**

- `apps/api/src/server/services/fragments-service.ts:459-555`
- `apps/api/src/server/services/competitive-service.ts:613-635`

**Evidence:** Fragments profile uses twelve concurrent queries, including multiple groupings and ordered scans. Competitive snapshots add per-player counts and sums. `Promise.all` reduces wall-clock latency but does not reduce database work.

**Impact:** Concurrent profile loads can consume connection-pool capacity and compete with gameplay writes. The risk is workload-dependent and not currently measured.

**Recommended solution:** Instrument query duration and pool wait time first. Consolidate only the hot queries with a concrete measured benefit; avoid a broad repository rewrite.

**Effort:** Medium. **Confidence:** Confirmed query shape; severity requires validation.

**Suggested tests:** Query count and response equivalence; load test with realistic completion/player cardinalities.

#### M-05 — No graceful process shutdown or readiness distinction

**Affected files:**

- `apps/api/src/index.ts:1-11`
- `apps/api/src/server/node-server.ts:12-15`
- `apps/api/src/server/realtime/coop-realtime.ts:142-157`
- `apps/api/src/lib/prisma.ts`
- `apps/api/src/server/http-app.ts:17-23`

**Evidence:** The entrypoint starts the server but does not register SIGTERM/SIGINT handlers, close the realtime hub, stop accepting HTTP requests, or disconnect Prisma. `/api/health` always returns `{ ok: true }` and does not verify database readiness or catalog readiness beyond module initialization.

**Impact:** Deploy/restart events can terminate active WebSocket clients abruptly and leave in-flight work without a coordinated drain. Health checks can report healthy while the database or gameplay catalog is unavailable.

**Recommended solution:** Add a small shutdown coordinator to the existing Node process: stop new connections, close/reject WebSocket upgrades, close the hub, wait for the HTTP server, and disconnect Prisma with a timeout. Add a separate readiness check if operational consumers need database/catalog status; do not change the existing liveness contract without compatibility review.

**Effort:** Medium. **Confidence:** Confirmed.

**Suggested tests:** Signal handling with a test server, idempotent shutdown, WebSocket close behavior, and readiness failure when database/catalog initialization is unavailable.

#### M-06 — WebSocket ordering and reconnect semantics are under-specified

**Affected files:**

- `apps/api/src/server/realtime/coop-realtime.ts:50-82`
- `apps/api/src/server/reconnect.ts:1-8`
- `apps/web/src/types/ws.ts:1-25`
- `apps/api/src/server/realtime/coop-realtime.test.ts:71-101`

**Evidence:** `broadcastRoom` launches `pushSnapshot` for all sockets concurrently. Each socket increments its sequence only after its database read completes. There is no server-side reconnect protocol; `reconnect.ts` is a placeholder, while the web type file contains client reconnect message types not implemented by the server.

**Impact:** A slow earlier read can complete after a later read, and sequence numbers describe delivery completion rather than a shared room version. Clients can still recover through polling, but realtime consumers cannot distinguish stale state from current state solely from `seq`.

**Recommended solution:** Define whether `seq` is per-connection delivery order or a room revision. If ordering matters, serialize broadcasts per room or add a database/version revision and discard stale snapshots client-side. Document reconnect as polling fallback until a real protocol is implemented.

**Effort:** Medium. **Confidence:** Confirmed protocol gap; user-visible impact requires a delayed-read test.

**Suggested tests:** Delayed first snapshot followed by a newer snapshot; reconnect after dropped connection; duplicate/out-of-order delivery with polling recovery.

#### M-07 — Error handling and diagnostics are inconsistent

**Affected files:**

- Route handlers such as `apps/api/src/server/coop-routes.ts:1-167`, `competitive-routes.ts:1-142`, `fragments-routes.ts:16-70`, and `single-player-routes.ts:20-161`
- `apps/api/src/server/http-app.ts:25-52`
- `apps/api/src/server/realtime/coop-realtime.ts:66-75`
- `apps/api/src/server/realtime/coop-notify.ts:25-34`

**Evidence:** Domain errors are converted locally, while unexpected errors are rethrown to Hono's default handling. Realtime notification failures are deliberately swallowed, and snapshot failures send only an error string. There is no request correlation id, structured logger, or server-side diagnostic event for failed broadcasts.

**Impact:** Clients may receive inconsistent error shapes/status behavior, and operators cannot reliably correlate a failed mutation with its database or realtime notification. Swallowing notification failures is acceptable for polling fallback but should be observable.

**Recommended solution:** Add a narrow global error handler and structured logging adapter, preserving current public error bodies. Log request id, route, actor kind, room/game id, and error category without tokens or sensitive payloads. Keep notification best-effort but count/log failures.

**Effort:** Medium. **Confidence:** Confirmed.

**Suggested tests:** Stable JSON error shape for unexpected errors, no secret/token logging, request-id propagation, and notification failure diagnostics.

### Low

#### L-01 — Legacy placeholders and compatibility paths increase maintenance ambiguity

**Affected files:**

- `apps/api/src/server/websocket.ts:1-15`
- `apps/api/src/server/reconnect.ts:1-8`
- `apps/api/src/server/timers.ts:1-8`
- `apps/api/src/server/realtime/coop-notify.ts:12-34`
- Legacy aliases in `apps/api/src/server/single-player-routes.ts:31-38`

**Evidence:** The active unified server coexists with a placeholder WebSocket module, placeholder reconnect/timer modules, and a legacy notification fallback. These are documented in places, but ownership and removal criteria are not centralized.

**Impact:** Future maintainers may implement behavior in an inactive module or assume reconnect/timers are server-authoritative when they are not.

**Recommended solution:** Add a short ownership/deprecation note and explicit tests/README references. Remove only after compatibility usage is measured and no deployment depends on it.

**Effort:** Small. **Confidence:** Confirmed.

#### L-02 — Card catalog initialization is process-local and health semantics are implicit

**Affected files:**

- `apps/api/src/server/http-app.ts:17-23`
- `apps/api/src/server/services/card-catalog-service.ts:1-225`
- `docs/ARCHITECTURE.md:40-47`

**Evidence:** The catalog is loaded once into process memory. Documentation says gameplay should not be considered healthy if catalog load fails, but the health route itself does not expose catalog readiness.

**Impact:** Multiple processes can serve different catalog snapshots after package/data changes, and operational health checks may miss a catalog failure.

**Recommended solution:** Keep the current in-memory design, but expose a small readiness signal and record catalog version/count at boot. Rebuild only if benchmarks or deployment requirements justify it.

**Effort:** Small. **Confidence:** Confirmed.

#### L-03 — Fresh local audit validation is blocked by the shell environment

**Affected files:**

- Test configuration and scripts in `package.json`, `apps/api/package.json`, and `apps/api/vitest.config.ts`

**Evidence:** `npm test` was invoked from the repository root and failed before execution with `zsh: operation not permitted: npm`.

**Impact:** This audit cannot independently certify the reported 234-test baseline from the current shell session.

**Recommended solution:** Repair the local executable permission/toolchain, then run `npm test`, both TypeScript checks, and focused PostgreSQL-backed integration tests. This is an environment task, not an application finding.

**Effort:** Small. **Confidence:** Confirmed for this audit environment.

## 4. Global versus game-specific changes

### Apply globally

- Atomic terminal-statistics claim and concurrency tests, because all Guess game modes call the shared terminal stats service.
- Room/seat identity database invariants and transaction boundaries for room creation.
- Request validation conventions for bounded strings, integers, and arrays.
- WebSocket lifecycle controls and shutdown coordination in the unified Node process.
- Structured error handling, request correlation, and rate-limit/CORS policy.
- Database-backed integration-test harness and migration verification.

### Apply individually

- Co-op: active-turn/host-override transitions, unauthorized subscription handling, broadcast ordering, and leave/end-game races.
- Competitive: reconciliation serialization, deadline advancement, N+1 snapshot aggregation, and duplicate terminal reconciliation.
- Single-player/Challenge: forfeit-vs-guess terminal races and challenge outcome transitions.
- Fragments: proof replay limits, completion idempotency, profile query cost, and leaderboard pagination. Fragments already has the strongest request parser and unique `runId` protection, so it should not inherit weaker Guess validation patterns.

## 5. Prioritized implementation backlog

### P0 — Must address before production

1. **Make terminal stats aggregation atomically claimable** (H-01). Dependency: none. Add PostgreSQL concurrency tests first, then implement the smallest transaction change.
2. **Make room plus initial host seat creation one transaction** (H-02). Dependency: none. Add rollback coverage.
3. **Add and validate identity invariants** (H-03). Dependency: data audit/repair before migration; coordinate with generated Prisma client and migration deployment.
4. **Harden WebSocket lifecycle** (H-04). Dependency: define reconnect/order semantics in M-06; preserve HTTP polling fallback.
5. **Bound Guess multiplayer inputs** (H-05). Dependency: agree limits with existing clients; add route compatibility tests.
6. **Add real PostgreSQL concurrency/integration coverage** for the above. Dependency: local database/test isolation setup; this is a validation prerequisite for closing P0 items.

### P1 — Strongly recommended

1. Add graceful shutdown and readiness distinction (M-05). Dependency: unified server lifecycle from P0 WebSocket work.
2. Clarify and harden rate-limit identity/proxy behavior and CORS on rejection responses (M-01).
3. Eliminate Competitive snapshot N+1 queries (M-02).
4. Serialize or version realtime broadcasts and document reconnect behavior (M-06).
5. Add global structured error handling and observable notification failures (M-07).
6. Benchmark and optimize leaderboard/profile query plans (M-03, M-04). Dependency: realistic fixtures and instrumentation, not guesswork.

### P2 — Optional maintainability and optimization

1. Clarify ownership/deprecation of placeholders and legacy realtime paths (L-01).
2. Add catalog readiness/version diagnostics (L-02).
3. Replace offset pagination with keyset pagination if benchmark results justify it (M-03).
4. Consolidate repeated validation helpers only after the concrete field limits are agreed.

### Suggested implementation order

1. Establish a PostgreSQL-backed test harness and seed isolation.
2. Fix atomic room creation and add database identity checks.
3. Fix terminal stats claiming and test all terminal entry points concurrently.
4. Add request bounds and authorization regression tests.
5. Define and implement WebSocket heartbeat, close, backpressure, ordering, and shutdown behavior.
6. Add diagnostics/readiness and then benchmark query-heavy endpoints.
7. Apply only measured query optimizations and clean up legacy documentation/modules last.

## 6. Audit conclusion

The current architecture is suitable for incremental hardening. The unified Node process, polling fallback, Prisma transactions, unique active-seat index, signed guest sessions, and Fragments proof verification are useful foundations. The repository should not undergo a major rewrite. Production readiness depends primarily on closing the atomicity/data-integrity gaps and adding database-backed concurrency tests; performance work should follow instrumentation rather than assumptions.
