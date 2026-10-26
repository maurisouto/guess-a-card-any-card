import { createAdaptorServer } from "@hono/node-server";
import type { Server } from "node:http";
import { app } from "@/server/http-app";
import { attachCoopRealtime, type CoopRealtimeHub } from "@/server/realtime/coop-realtime";

export type ApiNodeServer = {
  server: Server;
  realtime: CoopRealtimeHub;
};

export function createApiNodeServer(): ApiNodeServer {
  const server = createAdaptorServer({ fetch: app.fetch }) as Server;
  const realtime = attachCoopRealtime(server);
  return { server, realtime };
}
