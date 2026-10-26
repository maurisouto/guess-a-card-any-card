import { getRequestListener } from "@hono/node-server";
import type { Server } from "node:http";
import { createServer } from "node:http";
import { app } from "@/server/http-app";
import { attachCoopRealtime, type CoopRealtimeHub } from "@/server/realtime/coop-realtime";

export type ApiNodeServer = {
  server: Server;
  realtime: CoopRealtimeHub;
};

export function createApiNodeServer(): ApiNodeServer {
  const server: Server = createServer(getRequestListener(app.fetch));
  const realtime = attachCoopRealtime(server);
  return { server, realtime };
}

export function closeApiNodeServer(api: ApiNodeServer): Promise<void> {
  api.realtime.close();
  return new Promise((resolve, reject) => {
    api.server.close((error) => (error ? reject(error) : resolve()));
  });
}
