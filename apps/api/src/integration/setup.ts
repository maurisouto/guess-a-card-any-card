import { integrationDatabaseUrl, loadIntegrationEnv } from "./test-database";

loadIntegrationEnv();
const testDatabaseUrl = integrationDatabaseUrl();
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = testDatabaseUrl;
