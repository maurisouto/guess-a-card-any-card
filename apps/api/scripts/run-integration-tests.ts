import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertSafeTestDatabaseUrl,
  integrationEnv,
  loadIntegrationEnv,
} from "../src/integration/test-database";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(apiRoot, "../..");

loadIntegrationEnv();
const testDatabaseUrl = assertSafeTestDatabaseUrl(process.env.TEST_DATABASE_URL);
const env = integrationEnv();
env.DATABASE_URL = testDatabaseUrl;

const prismaBin = path.join(repoRoot, "node_modules", ".bin", "prisma");
const vitestBin = path.join(repoRoot, "node_modules", ".bin", "vitest");

// This is intentionally migrate deploy, never migrate reset/db push/drop/truncate.
execFileSync(prismaBin, ["migrate", "deploy", "--config", "prisma.config.ts"], {
  cwd: apiRoot,
  env,
  stdio: "inherit",
});

execFileSync(vitestBin, ["run", "--config", "vitest.integration.config.ts"], {
  cwd: apiRoot,
  env,
  stdio: "inherit",
});
