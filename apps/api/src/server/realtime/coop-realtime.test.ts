import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";
import { notifyCoopRoom } from "@/server/realtime/coop-notify";

const getCoopRoomPublic = vi.hoisted(() => vi.fn());

vi.mock("@/server/services/coop-service", () => ({
  CoopHttpError: class CoopHttpError extends Error {
    constructor(public status: number, message: string) {
      super(message);
    }
  },
  getCoopRoomPublic,
}));

import { attachCoopRealtime, type CoopRealtimeHub } from "@/server/realtime/coop-realtime";

let server: Server | null = null;
let realtime: CoopRealtimeHub | null = null;

async function listen(): Promise<number> {
  server = createServer((_req, res) => res.writeHead(404).end());
  realtime = attachCoopRealtime(server);
  await new Promise<void>((resolve, reject) => {
    server!.once("error", reject);
    server!.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Server did not expose a port.");
  return address.port;
}

async function close(): Promise<void> {
  realtime?.close();
  realtime = null;
  if (!server?.listening) {
    server = null;
    return;
  }
  await new Promise<void>((resolve, reject) => {
    server!.close((error) => (error ? reject(error) : resolve()));
  });
  server = null;
}

afterEach(async () => {
  getCoopRoomPublic.mockReset();
  await close();
});

describe("co-op realtime snapshots", () => {
  it("sends the initial snapshot and broadcasts later local notifications", async () => {
    const snapshot = {
      id: "11111111-1111-4111-8111-111111111111",
      state: "LOBBY",
      selectedSets: [],
      requesterIsHost: true,
      players: [],
      game: null,
    };
    getCoopRoomPublic.mockResolvedValue(snapshot);
    const port = await listen();
    const ws = new WebSocket(`ws://127.0.0.1:${port}/coop-ws`);

    await new Promise<void>((resolve, reject) => {
      ws.once("open", resolve);
      ws.once("error", reject);
    });

    const messages: string[] = [];
    let resolveFirstState!: () => void;
    const firstState = new Promise<void>((resolve) => {
      resolveFirstState = resolve;
    });
    const stateMessages = new Promise<void>((resolve, reject) => {
      ws.on("message", (data) => {
        messages.push(data.toString());
        if (messages.length === 1) resolveFirstState();
        if (messages.length === 2) resolve();
      });
      ws.once("error", reject);
    });

    ws.send(
      JSON.stringify({
        type: "subscribe",
        roomId: "11111111-1111-4111-8111-111111111111",
        guestId: "guest-1234567890",
        protocol: 1,
      }),
    );
    await firstState;
    notifyCoopRoom("11111111-1111-4111-8111-111111111111");
    await stateMessages;

    expect(messages.map((message) => JSON.parse(message))).toEqual([
      { type: "state", seq: 1, payload: snapshot },
      { type: "state", seq: 2, payload: snapshot },
    ]);
    expect(getCoopRoomPublic).toHaveBeenCalledTimes(2);
    ws.close();
  });
});
