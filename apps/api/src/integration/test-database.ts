import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnvFile } from "dotenv";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const repoRoot = path.resolve(apiRoot, "../..");

/** Load only local env files; TEST_DATABASE_URL must still be explicit. */
export function loadIntegrationEnv(): void {
  loadEnvFile({ path: path.join(repoRoot, ".env") });
  loadEnvFile({ path: path.join(apiRoot, ".env") });
}

function databaseName(url: URL): string {
  const name = decodeURIComponent(url.pathname.replace(/^\/+/, "")).trim().toLowerCase();
  if (!name) throw new Error("TEST_DATABASE_URL must include a database name.");
  return name;
}

/**
 * Positive guard for every command that can connect to the integration database.
 * The marker is deliberately strict so a development or production database cannot be selected
 * accidentally by a similarly named URL.
 */
export function assertSafeTestDatabaseUrl(raw: string | undefined): string {
  const value = raw?.trim() ?? "";
  if (!value) {
    throw new Error(
      "TEST_DATABASE_URL is required. Refusing to run integration database operations without an explicit test URL.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("TEST_DATABASE_URL must be a valid PostgreSQL URL.");
  }

  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("TEST_DATABASE_URL must use the postgres:// or postgresql:// scheme.");
  }

  const name = databaseName(parsed);
  const hasTestMarker = /(^|[-_])(test|testing|vitest)([-_]|$)/.test(name);
  if (!hasTestMarker) {
    throw new Error(
      `Refusing database '${name}'. TEST_DATABASE_URL must target a database named with a test marker (for example guess_a_card_test).`,
    );
  }

  if (/(^|[-_])(prod|production|stage|staging|dev|development|main)([-_]|$)/.test(name)) {
    throw new Error(`Refusing database '${name}' because it contains a non-test environment marker.`);
  }

  const configuredDevelopmentUrl = (
    process.env.GAC_DEVELOPMENT_DATABASE_URL ?? process.env.DATABASE_URL
  )?.trim();
  if (configuredDevelopmentUrl && configuredDevelopmentUrl === value) {
    throw new Error("TEST_DATABASE_URL must not be the same as DATABASE_URL.");
  }

  return value;
}

export function integrationDatabaseUrl(): string {
  return assertSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL);
}

export function integrationEnv(): NodeJS.ProcessEnv {
  const url = integrationDatabaseUrl();
  return {
    ...process.env,
    NODE_ENV: "test",
    GAC_DEVELOPMENT_DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_URL: url,
    TEST_DATABASE_URL: url,
  };
}
