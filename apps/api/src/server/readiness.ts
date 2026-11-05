import { prisma } from "@/lib/prisma";
import { getApplicationLifecycleState } from "@/server/app-lifecycle";
import { isCardCatalogReady } from "@/server/services/card-catalog-service";

const READINESS_CACHE_MS = 5_000;
const DATABASE_CHECK_TIMEOUT_MS = 1_000;

let cachedDatabaseCheck: { checkedAt: number; healthy: boolean } | null = null;
let databaseCheckInFlight: Promise<boolean> | null = null;

async function checkDatabase(): Promise<boolean> {
  try {
    const query = prisma.$queryRaw`SELECT 1`;
    const timeout = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => reject(new Error("database readiness timeout")), DATABASE_CHECK_TIMEOUT_MS);
      timer.unref?.();
    });
    await Promise.race([query, timeout]);
    return true;
  } catch {
    return false;
  }
}

async function checkDatabaseCached(): Promise<boolean> {
  const now = Date.now();
  if (cachedDatabaseCheck && now - cachedDatabaseCheck.checkedAt < READINESS_CACHE_MS) {
    return cachedDatabaseCheck.healthy;
  }
  if (!databaseCheckInFlight) {
    databaseCheckInFlight = checkDatabase().then((healthy) => {
      cachedDatabaseCheck = { checkedAt: Date.now(), healthy };
      return healthy;
    }).finally(() => {
      databaseCheckInFlight = null;
    });
  }
  return databaseCheckInFlight;
}

export async function isApplicationReady(): Promise<boolean> {
  if (getApplicationLifecycleState() !== "ready" || !isCardCatalogReady()) {
    return false;
  }
  return checkDatabaseCached();
}

export function __resetReadinessForTests(): void {
  cachedDatabaseCheck = null;
  databaseCheckInFlight = null;
}
