# Backend PostgreSQL integration tests

The repository has two test layers:

- `npm test` runs the existing unit and HTTP tests. These use Vitest mocks where appropriate and do not require PostgreSQL.
- `npm run test:integration` runs the PostgreSQL-backed tests under `apps/api/src/integration/`. The runner applies the existing Prisma migrations with `prisma migrate deploy`, then runs only the integration Vitest project.

## Safety model

Integration tests never use the development `DATABASE_URL` implicitly. They require an explicit `TEST_DATABASE_URL` and refuse to run unless:

- the URL uses `postgres://` or `postgresql://`;
- the database name contains a marker bounded by `-` or `_`: `test`, `testing`, or `vitest`;
- the database name does not contain `dev`, `development`, `stage`, `staging`, `prod`, `production`, or `main`;
- `TEST_DATABASE_URL` is not identical to `DATABASE_URL`.

The runner only executes `prisma migrate deploy`. It does not run `migrate reset`, `db push`, `drop`, `truncate`, or any other destructive command. Test cleanup deletes only fixture room IDs created by the current integration test file.

## Local setup

Create a dedicated PostgreSQL database manually, outside the application database. For a local PostgreSQL installation, for example:

```bash
createdb guess_a_card_test
```

Set an explicit URL in the shell or in the local ignored `.env`:

```env
TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/guess_a_card_test
```

Use the actual local PostgreSQL user, password, host and port. Keep `DATABASE_URL` pointed at the development database; the harness verifies that the two values differ.

## Commands

From the repository root:

```bash
npm run test:integration
```

This applies all migrations from `apps/api/prisma/migrations` to the dedicated test database and runs the integration suite. It is safe to run repeatedly because `prisma migrate deploy` is idempotent and fixture cleanup is scoped.

Run unit tests separately:

```bash
npm test
```

Run the API typecheck:

```bash
cd apps/api && npx tsc --noEmit
```

## Concurrency model

Integration tests do not wrap the entire suite in one shared transaction. Each `prisma.$transaction` obtains its own transaction/connection from the Prisma PostgreSQL pool. The unique-seat test starts two independent transactions with `Promise.allSettled`, proving the database—not a test mutex—resolves the race.

## Current coverage

The initial harness proves:

1. An exception in an interactive Prisma transaction rolls back all writes.
2. The existing partial unique index rejects two concurrent active seats for the same guest in the same room.

The harness now covers H-02 room creation rollback, H-03 identity `CHECK` constraints, and H-01 terminal-statistics concurrency, rollback, and idempotency.
