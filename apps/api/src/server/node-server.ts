import { getRequestListener } from "@hono/node-server";
import type { Server } from "node:http";
import { createServer } from "node:http";
import { app } from "@/server/http-app";
import { attachCoopRealtime, type CoopRealtimeHub } from "@/server/realtime/coop-realtime";
import { prisma } from "@/lib/prisma";
import {
  markApplicationShuttingDown,
  markApplicationStopped,
} from "@/server/app-lifecycle";

export type ApiNodeServer = {
  server: Server;
  realtime: CoopRealtimeHub;
};

export function createApiNodeServer(): ApiNodeServer {
  const server: Server = createServer(getRequestListener(app.fetch));
  const realtime = attachCoopRealtime(server);
  return { server, realtime };
}

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

function shutdownTimeoutMs(): number {
  const value = Number.parseInt(process.env.API_SHUTDOWN_TIMEOUT_MS ?? "", 10);
  return Number.isInteger(value) && value >= 100 && value <= 120_000
    ? value
    : DEFAULT_SHUTDOWN_TIMEOUT_MS;
}

export async function closeApiNodeServer(
  api: ApiNodeServer,
  timeoutMs = shutdownTimeoutMs(),
): Promise<void> {
  markApplicationShuttingDown();
  api.realtime.close();
  let timedOut = false;
  const closeResult = new Promise<void>((resolve, reject) => {
    try {
      api.server.close((error) => (error ? reject(error) : resolve()));
    } catch (error) {
      reject(error);
    }
  });
  let shutdownTimer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    shutdownTimer = setTimeout(() => {
      timedOut = true;
      api.server.closeAllConnections();
      resolve();
    }, timeoutMs);
    shutdownTimer.unref?.();
  });

  try {
    await Promise.race([closeResult, timeout]);
  } finally {
    if (shutdownTimer) clearTimeout(shutdownTimer);
    await prisma.$disconnect();
    markApplicationStopped();
  }
  if (timedOut) throw new Error("API shutdown timed out; active connections were terminated.");
}
