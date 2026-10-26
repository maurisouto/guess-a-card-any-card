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

async function listen(options?: Parameters<typeof attachCoopRealtime>[1]): Promise<number> {
  server = createServer((_req, res) => res.writeHead(404).end());
  realtime = attachCoopRealtime(server, options);
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

function connect(port: number): Promise<WebSocket> {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/coop-ws`);
  return new Promise((resolve, reject) => {
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
  });
}

function waitForClose(ws: WebSocket): Promise<{ code: number; reason: string }> {
  return new Promise((resolve) => {
    ws.once("close", (code, reason) => resolve({ code, reason: reason.toString() }));
  });
}

function waitForMessage(ws: WebSocket): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    ws.once("message", (data) => resolve(JSON.parse(data.toString()) as Record<string, unknown>));
    ws.once("error", reject);
  });
}

function subscribe(ws: WebSocket, roomId = "11111111-1111-4111-8111-111111111111"): void {
  ws.send(JSON.stringify({
    type: "subscribe",
    roomId,
    guestId: "guest-1234567890",
    protocol: 1,
  }));
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
    expect(getCoopRoomPublic).toHaveBeenCalledTimes(3);
    ws.close();
  });

  it("closes unauthorized subscriptions and removes them from broadcasts", async () => {
    getCoopRoomPublic.mockRejectedValue(new (class extends Error {
      status = 403;
    })("Not a room member."));
    const port = await listen();
    const ws = await connect(port);
    const closed = waitForClose(ws);
    subscribe(ws);

    await expect(waitForMessage(ws)).resolves.toMatchObject({ type: "error", code: "SUBSCRIBE_ERROR" });
    await expect(closed).resolves.toMatchObject({ code: 1008 });
    getCoopRoomPublic.mockClear();
    await realtime!.broadcastRoom("11111111-1111-4111-8111-111111111111");
    expect(getCoopRoomPublic).not.toHaveBeenCalled();
  });

  it("rejects unsupported subscription protocol versions", async () => {
    getCoopRoomPublic.mockResolvedValue({ id: "room" });
    const port = await listen();
    const ws = await connect(port);
    const closed = waitForClose(ws);
    ws.send(JSON.stringify({
      type: "subscribe",
      roomId: "11111111-1111-4111-8111-111111111111",
      guestId: "guest-1234567890",
      protocol: 999,
    }));

    await expect(waitForMessage(ws)).resolves.toMatchObject({
      type: "error",
      code: "PROTOCOL",
    });
    await expect(closed).resolves.toMatchObject({ code: 1008 });
    expect(getCoopRoomPublic).not.toHaveBeenCalled();
  });

  it("rejects malformed messages with a policy close", async () => {
    getCoopRoomPublic.mockResolvedValue({ id: "room" });
    const port = await listen();
    const ws = await connect(port);
    const closed = waitForClose(ws);
    ws.send("not-json");

    await expect(waitForMessage(ws)).resolves.toMatchObject({ type: "error", code: "BAD_MESSAGE" });
    await expect(closed).resolves.toMatchObject({ code: 1008 });
  });

  it("closes oversized messages with code 1009", async () => {
    const oldMaxPayload = 64;
    server = createServer((_req, res) => res.writeHead(404).end());
    realtime = attachCoopRealtime(server, { maxMessageBytes: oldMaxPayload });
    await new Promise<void>((resolve, reject) => {
      server!.once("error", reject);
      server!.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Server did not expose a port.");
    const ws = await connect(address.port);
    const closed = waitForClose(ws);
    ws.send("x".repeat(oldMaxPayload + 1));

    await expect(closed).resolves.toMatchObject({ code: 1009 });
  });

  it("limits message frequency and repeated subscriptions per connection", async () => {
    getCoopRoomPublic.mockResolvedValue({ id: "room" });
    const port = await listen({
      maxMessagesPerWindow: 2,
      maxSubscriptionsPerConnection: 2,
      messageWindowMs: 10_000,
    });
    const ws = await connect(port);
    const closed = waitForClose(ws);
    ws.send(JSON.stringify({ type: "ping" }));
    ws.send(JSON.stringify({ type: "ping" }));
    ws.send(JSON.stringify({ type: "ping" }));

    await expect(closed).resolves.toMatchObject({ code: 1008 });
    expect(getCoopRoomPublic).not.toHaveBeenCalled();
  });

  it("keeps a responsive client alive with server heartbeat", async () => {
    getCoopRoomPublic.mockResolvedValue({ id: "room" });
    const port = await listen({ heartbeatIntervalMs: 10, staleConnectionMs: 45 });
    const ws = await connect(port);
    subscribe(ws);
    await waitForMessage(ws);
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  it("evicts a client that does not answer heartbeat pings", async () => {
    getCoopRoomPublic.mockResolvedValue({ id: "room" });
    const pong = vi.spyOn(WebSocket.prototype, "pong").mockImplementation(() => undefined);
    try {
      const port = await listen({ heartbeatIntervalMs: 10, staleConnectionMs: 25 });
      const ws = await connect(port);
      subscribe(ws);
      await waitForMessage(ws);
      await expect(waitForClose(ws)).resolves.toMatchObject({ code: 1001 });
    } finally {
      pong.mockRestore();
    }
  });

  it("isolates concurrent broadcasts and drops stale snapshot reads", async () => {
    const firstRead = defer<Record<string, unknown>>();
    const secondRead = defer<Record<string, unknown>>();
    getCoopRoomPublic
      .mockResolvedValueOnce({ id: "initial" })
      .mockResolvedValueOnce({ id: "initial" })
      .mockImplementationOnce(() => firstRead.promise)
      .mockImplementationOnce(() => secondRead.promise);
    const port = await listen();
    const ws = await connect(port);
    subscribe(ws);
    await waitForMessage(ws);

    const firstBroadcast = realtime!.broadcastRoom("11111111-1111-4111-8111-111111111111");
    const secondBroadcast = realtime!.broadcastRoom("11111111-1111-4111-8111-111111111111");
    secondRead.resolve({ id: "new" });
    await new Promise((resolve) => setImmediate(resolve));
    firstRead.resolve({ id: "old" });
    await Promise.all([firstBroadcast, secondBroadcast]);

    await expect(waitForMessage(ws)).resolves.toMatchObject({
      type: "state",
      seq: 2,
      payload: { id: "new" },
    });
    ws.close();
  });

  it("reconciles a room mutation that races with initial subscription", async () => {
    const authorization = defer<Record<string, unknown>>();
    const initialSnapshot = defer<Record<string, unknown>>();
    const currentSnapshot = defer<Record<string, unknown>>();
    getCoopRoomPublic
      .mockImplementationOnce(() => authorization.promise)
      .mockImplementationOnce(() => initialSnapshot.promise)
      .mockImplementationOnce(() => currentSnapshot.promise);

    const port = await listen();
    const ws = await connect(port);
    ws.send(JSON.stringify({
      type: "subscribe",
      roomId: "11111111-1111-4111-8111-111111111111",
      guestId: "guest-1234567890",
      protocol: 1,
    }));

    authorization.resolve({ id: "authorized" });
    await waitForMockCalls(2);

    const update = waitForMessage(ws);
    const broadcast = realtime!.broadcastRoom("11111111-1111-4111-8111-111111111111");
    currentSnapshot.resolve({ id: "new" });
    await new Promise((resolve) => setImmediate(resolve));
    initialSnapshot.resolve({ id: "old" });
    await broadcast;

    await expect(update).resolves.toMatchObject({
      type: "state",
      seq: 1,
      payload: { id: "new" },
    });
    ws.close();
  });

  it("delivers broadcasts independently to multiple subscribers", async () => {
    getCoopRoomPublic.mockResolvedValue({ id: "room" });
    const port = await listen();
    const first = await connect(port);
    const second = await connect(port);
    subscribe(first);
    subscribe(second);
    await Promise.all([waitForMessage(first), waitForMessage(second)]);

    getCoopRoomPublic.mockResolvedValue({ id: "updated" });
    const firstUpdate = waitForMessage(first);
    const secondUpdate = waitForMessage(second);
    await realtime!.broadcastRoom("11111111-1111-4111-8111-111111111111");
    await expect(firstUpdate).resolves.toMatchObject({ payload: { id: "updated" } });
    await expect(secondUpdate).resolves.toMatchObject({ payload: { id: "updated" } });
    first.close();
    second.close();
  });

  it("disconnects a subscriber whose outbound buffer exceeds the limit", async () => {
    getCoopRoomPublic.mockResolvedValue({ id: "room" });
    const port = await listen({ maxBufferedAmount: 1 });
    const ws = await connect(port);
    subscribe(ws);
    await waitForMessage(ws);

    const bufferedAmount = vi
      .spyOn(WebSocket.prototype, "bufferedAmount", "get")
      .mockReturnValue(2);
    try {
      const closed = waitForClose(ws);
      await realtime!.broadcastRoom("11111111-1111-4111-8111-111111111111");
      await expect(closed).resolves.toMatchObject({ code: 1013 });
    } finally {
      bufferedAmount.mockRestore();
    }
  });

  it("isolates a send failure by closing only the affected socket", async () => {
    getCoopRoomPublic.mockResolvedValue({ id: "room" });
    const port = await listen();
    const ws = await connect(port);
    subscribe(ws);
    await waitForMessage(ws);

    const send = vi.spyOn(WebSocket.prototype, "send").mockImplementation((...args: any[]) => {
      const callback = args.at(-1);
      if (typeof callback === "function") callback(new Error("synthetic send failure"));
    });
    try {
      const closed = waitForClose(ws);
      await realtime!.broadcastRoom("11111111-1111-4111-8111-111111111111");
      await expect(closed).resolves.toMatchObject({ code: 1011 });
    } finally {
      send.mockRestore();
    }
  });

  it("closes all clients and rejects broadcasts during hub shutdown", async () => {
    getCoopRoomPublic.mockResolvedValue({ id: "room" });
    const port = await listen();
    const ws = await connect(port);
    subscribe(ws);
    await waitForMessage(ws);
    const closed = waitForClose(ws);
    realtime!.close();
    await expect(closed).resolves.toMatchObject({ code: 1001 });
    getCoopRoomPublic.mockClear();
    await realtime!.broadcastRoom("11111111-1111-4111-8111-111111111111");
    expect(getCoopRoomPublic).not.toHaveBeenCalled();
  });
});

function defer<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function waitForMockCalls(expected: number): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (getCoopRoomPublic.mock.calls.length >= expected) return;
    await new Promise((resolve) => setImmediate(resolve));
  }
  throw new Error(`Expected ${expected} snapshot calls, got ${getCoopRoomPublic.mock.calls.length}.`);
}
