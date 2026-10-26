import { afterEach, describe, expect, it } from "vitest";
import WebSocket from "ws";
import { createApiNodeServer, type ApiNodeServer } from "@/server/node-server";

let running: ApiNodeServer | null = null;

async function listen(server: ApiNodeServer["server"]): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Server did not expose a port.");
  return address.port;
}

async function close(server: ApiNodeServer["server"]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

afterEach(async () => {
  if (!running) return;
  running.realtime.close();
  if (running.server.listening) await close(running.server);
  running = null;
});

describe("unified Node API server", () => {
  it("serves Hono HTTP and co-op WebSocket traffic on the same port", async () => {
    running = createApiNodeServer();
    const port = await listen(running.server);

    const health = await fetch(`http://127.0.0.1:${port}/api/health`);
    expect(health.status).toBe(200);
    await expect(health.json()).resolves.toMatchObject({ ok: true });

    const ws = new WebSocket(`ws://127.0.0.1:${port}/coop-ws`);
    await new Promise<void>((resolve, reject) => {
      ws.once("open", () => resolve());
      ws.once("error", reject);
    });

    const pong = new Promise<string>((resolve, reject) => {
      ws.once("message", (data) => resolve(data.toString()));
      ws.once("error", reject);
    });
    ws.send(JSON.stringify({ type: "ping" }));

    await expect(pong).resolves.toBe(JSON.stringify({ type: "pong" }));
    ws.close();
  });
});
