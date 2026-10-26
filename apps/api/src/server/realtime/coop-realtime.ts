import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, WebSocket, type RawData } from "ws";
import {
  COOP_WS_PROTOCOL_VERSION,
  parseClientToServerMessage,
  type ServerToClientMessage,
} from "@gac/shared";
import { getCoopRoomPublic, CoopHttpError } from "@/server/services/coop-service";
import { resolveGuestSessionValue } from "@/server/auth/guest-session";
import { setLocalCoopRoomNotifier } from "@/server/realtime/coop-notify";

const DEFAULT_HEARTBEAT_INTERVAL_MS = 30_000;
const DEFAULT_STALE_CONNECTION_MS = 90_000;
const DEFAULT_MAX_MESSAGE_BYTES = 8 * 1024;
const DEFAULT_MAX_BUFFERED_AMOUNT = 256 * 1024;
const DEFAULT_MESSAGE_WINDOW_MS = 10_000;
const DEFAULT_MAX_MESSAGES_PER_WINDOW = 20;
const DEFAULT_MAX_SUBSCRIPTIONS = 4;

const CLOSE_POLICY_VIOLATION = 1008;
const CLOSE_MESSAGE_TOO_BIG = 1009;
const CLOSE_INTERNAL_ERROR = 1011;
const CLOSE_TRY_AGAIN = 1013;
const CLOSE_GOING_AWAY = 1001;

export type CoopRealtimeOptions = {
  heartbeatIntervalMs?: number;
  staleConnectionMs?: number;
  maxMessageBytes?: number;
  maxBufferedAmount?: number;
  messageWindowMs?: number;
  maxMessagesPerWindow?: number;
  maxSubscriptionsPerConnection?: number;
};

export type CoopRealtimeHub = {
  broadcastRoom: (roomId: string) => Promise<void>;
  handleUpgrade: (request: IncomingMessage, socket: Duplex, head: Buffer) => void;
  close: () => void;
};

type SocketMeta = {
  roomId: string | null;
  guestId: string | null;
  seq: number;
  latestSnapshotRequest: number;
  messageWindowStartedAt: number;
  messageCount: number;
  subscriptionCount: number;
  isAlive: boolean;
  lastPongAt: number;
  cleaned: boolean;
};

type ResolvedOptions = Required<CoopRealtimeOptions>;

function envNumber(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && Number.isInteger(value) && value >= min && value <= max
    ? value
    : fallback;
}

function resolveOptions(options: CoopRealtimeOptions): ResolvedOptions {
  const heartbeatIntervalMs = options.heartbeatIntervalMs ?? envNumber(
    "COOP_WS_HEARTBEAT_INTERVAL_MS",
    DEFAULT_HEARTBEAT_INTERVAL_MS,
    1_000,
    120_000,
  );
  return {
    heartbeatIntervalMs,
    staleConnectionMs: options.staleConnectionMs ?? envNumber(
      "COOP_WS_STALE_CONNECTION_MS",
      DEFAULT_STALE_CONNECTION_MS,
      heartbeatIntervalMs,
      600_000,
    ),
    maxMessageBytes: options.maxMessageBytes ?? envNumber(
      "COOP_WS_MAX_MESSAGE_BYTES",
      DEFAULT_MAX_MESSAGE_BYTES,
      256,
      64 * 1024,
    ),
    maxBufferedAmount: options.maxBufferedAmount ?? envNumber(
      "COOP_WS_MAX_BUFFERED_AMOUNT",
      DEFAULT_MAX_BUFFERED_AMOUNT,
      1_024,
      16 * 1024 * 1024,
    ),
    messageWindowMs: options.messageWindowMs ?? envNumber(
      "COOP_WS_MESSAGE_WINDOW_MS",
      DEFAULT_MESSAGE_WINDOW_MS,
      1_000,
      60_000,
    ),
    maxMessagesPerWindow: options.maxMessagesPerWindow ?? envNumber(
      "COOP_WS_MAX_MESSAGES_PER_WINDOW",
      DEFAULT_MAX_MESSAGES_PER_WINDOW,
      1,
      200,
    ),
    maxSubscriptionsPerConnection: options.maxSubscriptionsPerConnection ?? envNumber(
      "COOP_WS_MAX_SUBSCRIPTIONS",
      DEFAULT_MAX_SUBSCRIPTIONS,
      1,
      20,
    ),
  };
}

function logRealtimeFailure(event: string, error?: unknown): void {
  const detail = error instanceof Error ? error.message : undefined;
  console.warn(`[gac-api] coop websocket ${event}${detail ? `: ${detail}` : ""}`);
}

function declaredSubscribeProtocol(raw: string): unknown {
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
    const message = value as { type?: unknown; protocol?: unknown };
    return message.type === "subscribe" ? message.protocol : undefined;
  } catch {
    return undefined;
  }
}

export function createCoopRealtimeHub(options: CoopRealtimeOptions = {}): CoopRealtimeHub {
  const resolved = resolveOptions(options);
  const wss = new WebSocketServer({ noServer: true, maxPayload: resolved.maxMessageBytes });
  const socketMeta = new WeakMap<WebSocket, SocketMeta>();
  const roomSockets = new Map<string, Set<WebSocket>>();
  let shuttingDown = false;

  function removeSocket(ws: WebSocket): void {
    const meta = socketMeta.get(ws);
    if (!meta || meta.cleaned) return;
    meta.cleaned = true;
    meta.latestSnapshotRequest += 1;
    if (meta.roomId) {
      const sockets = roomSockets.get(meta.roomId);
      sockets?.delete(ws);
      if (sockets?.size === 0) roomSockets.delete(meta.roomId);
    }
    socketMeta.delete(ws);
  }

  function closeSocket(ws: WebSocket, code: number, reason: string): void {
    removeSocket(ws);
    try {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(code, reason);
      }
    } catch (error) {
      logRealtimeFailure("close failed", error);
      try {
        ws.terminate();
      } catch {
        // The socket is already unusable.
      }
    }
  }

  function sendJson(ws: WebSocket, message: ServerToClientMessage): boolean {
    if (ws.readyState !== WebSocket.OPEN) return false;
    if (ws.bufferedAmount > resolved.maxBufferedAmount) {
      logRealtimeFailure("backpressure limit exceeded");
      closeSocket(ws, CLOSE_TRY_AGAIN, "Realtime client is too slow.");
      return false;
    }
    try {
      ws.send(JSON.stringify(message), (error) => {
        if (error) {
          logRealtimeFailure("send failed", error);
          closeSocket(ws, CLOSE_INTERNAL_ERROR, "Realtime delivery failed.");
        }
      });
      return true;
    } catch (error) {
      logRealtimeFailure("send failed", error);
      closeSocket(ws, CLOSE_INTERNAL_ERROR, "Realtime delivery failed.");
      return false;
    }
  }

  function sendError(ws: WebSocket, code: string, message: string): void {
    sendJson(ws, { type: "error", code, message });
  }

  function addSocket(ws: WebSocket, roomId: string, guestId: string): void {
    const meta = socketMeta.get(ws);
    if (!meta) return;
    if (meta.roomId) {
      const previous = roomSockets.get(meta.roomId);
      previous?.delete(ws);
      if (previous?.size === 0) roomSockets.delete(meta.roomId);
    }
    meta.roomId = roomId;
    meta.guestId = guestId;
    meta.seq = 0;
    meta.latestSnapshotRequest += 1;
    let sockets = roomSockets.get(roomId);
    if (!sockets) {
      sockets = new Set();
      roomSockets.set(roomId, sockets);
    }
    sockets.add(ws);
  }

  async function pushSnapshot(ws: WebSocket): Promise<void> {
    const meta = socketMeta.get(ws);
    if (!meta || meta.cleaned || !meta.roomId || !meta.guestId) return;
    const requestId = ++meta.latestSnapshotRequest;
    try {
      const payload = await getCoopRoomPublic({
        roomId: meta.roomId,
        viewerGuestId: meta.guestId,
      });
      const current = socketMeta.get(ws);
      if (
        !current ||
        current.cleaned ||
        current.latestSnapshotRequest !== requestId ||
        ws.readyState !== WebSocket.OPEN
      ) {
        return;
      }
      current.seq += 1;
      sendJson(ws, { type: "state", seq: current.seq, payload });
    } catch (error) {
      const current = socketMeta.get(ws);
      if (!current || current.cleaned || current.latestSnapshotRequest !== requestId) return;
      if (error instanceof CoopHttpError) {
        sendError(ws, `HTTP_${error.status}`, error.message);
        if (error.status === 401 || error.status === 403 || error.status === 404) {
          closeSocket(ws, CLOSE_POLICY_VIOLATION, "Room authorization failed.");
        }
      } else {
        logRealtimeFailure("snapshot failed", error);
        sendError(ws, "SNAPSHOT_ERROR", "Snapshot unavailable.");
      }
    }
  }

  async function subscribe(
    ws: WebSocket,
    roomId: string,
    guestId: string,
    subscriptionAttempt: number,
  ): Promise<void> {
    const meta = socketMeta.get(ws);
    if (!meta || meta.cleaned || shuttingDown) return;

    try {
      await getCoopRoomPublic({ roomId, viewerGuestId: guestId });
    } catch (error) {
      const status =
        error instanceof CoopHttpError
          ? error.status
          : typeof error === "object" && error !== null && "status" in error &&
              typeof error.status === "number"
            ? error.status
            : null;
      if (status !== null) {
        const message = error instanceof Error ? error.message : "Subscription denied.";
        sendError(ws, `HTTP_${status}`, message);
        closeSocket(
          ws,
          status === 401 || status === 403 || status === 404
            ? CLOSE_POLICY_VIOLATION
            : CLOSE_INTERNAL_ERROR,
          status === 401 || status === 403 || status === 404
            ? "Subscription denied."
            : "Subscription failed.",
        );
      } else {
        logRealtimeFailure("subscription authorization failed", error);
        sendError(ws, "SUBSCRIBE_ERROR", "Subscription unavailable.");
        closeSocket(ws, CLOSE_INTERNAL_ERROR, "Subscription failed.");
      }
      return;
    }

    if (
      meta.cleaned ||
      shuttingDown ||
      ws.readyState !== WebSocket.OPEN ||
      meta.subscriptionCount !== subscriptionAttempt
    ) return;
    addSocket(ws, roomId, guestId);
    await pushSnapshot(ws);
  }

  const heartbeat = setInterval(() => {
    if (shuttingDown) return;
    const now = Date.now();
    for (const ws of [...wss.clients]) {
      const meta = socketMeta.get(ws);
      if (!meta || meta.cleaned) continue;
      if (ws.readyState !== WebSocket.OPEN) {
        removeSocket(ws);
        continue;
      }
      if (!meta.isAlive && now - meta.lastPongAt >= resolved.staleConnectionMs) {
        closeSocket(ws, CLOSE_GOING_AWAY, "Heartbeat timeout.");
        try {
          ws.terminate();
        } catch {
          // Cleanup is already complete.
        }
        continue;
      }
      meta.isAlive = false;
      try {
        ws.ping();
      } catch (error) {
        logRealtimeFailure("heartbeat failed", error);
        closeSocket(ws, CLOSE_GOING_AWAY, "Heartbeat failed.");
      }
    }
  }, resolved.heartbeatIntervalMs);
  heartbeat.unref?.();

  wss.on("connection", (ws: WebSocket) => {
    const meta: SocketMeta = {
      roomId: null,
      guestId: null,
      seq: 0,
      latestSnapshotRequest: 0,
      messageWindowStartedAt: Date.now(),
      messageCount: 0,
      subscriptionCount: 0,
      isAlive: true,
      lastPongAt: Date.now(),
      cleaned: false,
    };
    socketMeta.set(ws, meta);
    ws.on("pong", () => {
      const current = socketMeta.get(ws);
      if (current) {
        current.isAlive = true;
        current.lastPongAt = Date.now();
      }
    });
    ws.on("message", (data: RawData) => {
      const current = socketMeta.get(ws);
      if (!current || current.cleaned || shuttingDown) return;

      const raw = typeof data === "string" ? data : data.toString("utf8");
      if (Buffer.byteLength(raw, "utf8") > resolved.maxMessageBytes) {
        sendError(ws, "MESSAGE_TOO_BIG", "WebSocket message is too large.");
        closeSocket(ws, CLOSE_MESSAGE_TOO_BIG, "Message too large.");
        return;
      }

      const now = Date.now();
      if (now - current.messageWindowStartedAt >= resolved.messageWindowMs) {
        current.messageWindowStartedAt = now;
        current.messageCount = 0;
      }
      current.messageCount += 1;
      if (current.messageCount > resolved.maxMessagesPerWindow) {
        sendError(ws, "RATE_LIMITED", "Too many WebSocket messages.");
        closeSocket(ws, CLOSE_POLICY_VIOLATION, "Message rate exceeded.");
        return;
      }

      const declaredProtocol = declaredSubscribeProtocol(raw);
      if (declaredProtocol !== undefined && declaredProtocol !== COOP_WS_PROTOCOL_VERSION) {
        sendError(ws, "PROTOCOL", `Expected protocol ${COOP_WS_PROTOCOL_VERSION}.`);
        closeSocket(ws, CLOSE_POLICY_VIOLATION, "Unsupported protocol version.");
        return;
      }

      const parsed = parseClientToServerMessage(raw);
      if (!parsed) {
        sendError(ws, "BAD_MESSAGE", "Unrecognized or invalid envelope.");
        closeSocket(ws, CLOSE_POLICY_VIOLATION, "Invalid message.");
        return;
      }

      if (parsed.type === "ping") {
        sendJson(ws, { type: "pong" });
        return;
      }

      if (parsed.protocol !== COOP_WS_PROTOCOL_VERSION) {
        sendError(ws, "PROTOCOL", `Expected protocol ${COOP_WS_PROTOCOL_VERSION}.`);
        closeSocket(ws, CLOSE_POLICY_VIOLATION, "Unsupported protocol version.");
        return;
      }

      current.subscriptionCount += 1;
      if (current.subscriptionCount > resolved.maxSubscriptionsPerConnection) {
        sendError(ws, "SUBSCRIPTION_LIMIT", "Too many subscription attempts.");
        closeSocket(ws, CLOSE_POLICY_VIOLATION, "Subscription limit exceeded.");
        return;
      }

      let guestId: string;
      try {
        guestId = resolveGuestSessionValue(parsed.guestId);
      } catch (error) {
        sendError(
          ws,
          "GUEST_AUTH",
          error instanceof Error ? error.message : "Invalid guest session.",
        );
        closeSocket(ws, CLOSE_POLICY_VIOLATION, "Guest authorization failed.");
        return;
      }

      void subscribe(ws, parsed.roomId, guestId, current.subscriptionCount);
    });
    ws.on("close", () => removeSocket(ws));
    ws.on("error", (error) => {
      logRealtimeFailure("socket error", error);
      removeSocket(ws);
    });
  });

  return {
    async broadcastRoom(roomId: string): Promise<void> {
      const sockets = roomSockets.get(roomId);
      if (!sockets || shuttingDown) return;
      await Promise.allSettled([...sockets].map((ws) => pushSnapshot(ws)));
    },
    handleUpgrade(request, socket, head) {
      if (shuttingDown || !request.url?.startsWith("/coop-ws")) {
        socket.destroy();
        return;
      }
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    },
    close() {
      if (shuttingDown) return;
      shuttingDown = true;
      clearInterval(heartbeat);
      for (const ws of [...wss.clients]) {
        closeSocket(ws, CLOSE_GOING_AWAY, "Realtime hub shutting down.");
      }
      roomSockets.clear();
      wss.close();
    },
  };
}

export function attachCoopRealtime(
  server: Server,
  options: CoopRealtimeOptions = {},
): CoopRealtimeHub {
  const hub = createCoopRealtimeHub(options);
  const onUpgrade = (request: IncomingMessage, socket: Duplex, head: Buffer) =>
    hub.handleUpgrade(request, socket, head);
  server.on("upgrade", onUpgrade);
  const unregisterNotifier = setLocalCoopRoomNotifier(hub.broadcastRoom);

  return {
    ...hub,
    close() {
      server.off("upgrade", onUpgrade);
      unregisterNotifier();
      hub.close();
    },
  };
}
