import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, type RawData, type WebSocket } from "ws";
import {
  COOP_WS_PROTOCOL_VERSION,
  parseClientToServerMessage,
  type ServerToClientMessage,
} from "@gac/shared";
import { getCoopRoomPublic, CoopHttpError } from "@/server/services/coop-service";
import { resolveGuestSessionValue } from "@/server/auth/guest-session";
import { setLocalCoopRoomNotifier } from "@/server/realtime/coop-notify";

export type CoopRealtimeHub = {
  broadcastRoom: (roomId: string) => Promise<void>;
  handleUpgrade: (request: IncomingMessage, socket: Duplex, head: Buffer) => void;
  close: () => void;
};

type SocketMeta = { roomId: string; guestId: string; seq: number };

function sendError(ws: WebSocket, code: string, message: string): void {
  ws.send(JSON.stringify({ type: "error", code, message }));
}

export function createCoopRealtimeHub(): CoopRealtimeHub {
  const wss = new WebSocketServer({ noServer: true });
  const socketMeta = new WeakMap<WebSocket, SocketMeta>();
  const roomSockets = new Map<string, Set<WebSocket>>();

  function removeSocket(ws: WebSocket): void {
    const meta = socketMeta.get(ws);
    if (!meta) return;
    const sockets = roomSockets.get(meta.roomId);
    sockets?.delete(ws);
    if (sockets?.size === 0) roomSockets.delete(meta.roomId);
    socketMeta.delete(ws);
  }

  function addSocket(ws: WebSocket, roomId: string, guestId: string): void {
    removeSocket(ws);
    socketMeta.set(ws, { roomId, guestId, seq: 0 });
    let sockets = roomSockets.get(roomId);
    if (!sockets) {
      sockets = new Set();
      roomSockets.set(roomId, sockets);
    }
    sockets.add(ws);
  }

  async function pushSnapshot(ws: WebSocket): Promise<void> {
    const meta = socketMeta.get(ws);
    if (!meta) return;

    try {
      const payload = await getCoopRoomPublic({
        roomId: meta.roomId,
        viewerGuestId: meta.guestId,
      });
      meta.seq += 1;
      const message: ServerToClientMessage<typeof payload> = {
        type: "state",
        seq: meta.seq,
        payload,
      };
      ws.send(JSON.stringify(message));
    } catch (error) {
      const message =
        error instanceof CoopHttpError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Snapshot failed";
      const code = error instanceof CoopHttpError ? `HTTP_${error.status}` : "SNAPSHOT_ERROR";
      sendError(ws, code, message);
    }
  }

  async function broadcastRoom(roomId: string): Promise<void> {
    const sockets = roomSockets.get(roomId);
    if (!sockets) return;
    await Promise.all([...sockets].map((ws) => pushSnapshot(ws)));
  }

  wss.on("connection", (ws: WebSocket) => {
    ws.on("message", async (data: RawData) => {
      const raw = typeof data === "string" ? data : data.toString("utf8");
      const parsed = parseClientToServerMessage(raw);
      if (!parsed) {
        sendError(ws, "BAD_MESSAGE", "Unrecognized or invalid envelope.");
        return;
      }

      if (parsed.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
        return;
      }

      if (parsed.protocol !== COOP_WS_PROTOCOL_VERSION) {
        sendError(ws, "PROTOCOL", `Expected protocol ${COOP_WS_PROTOCOL_VERSION}.`);
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
        return;
      }

      addSocket(ws, parsed.roomId, guestId);
      await pushSnapshot(ws);
    });
    ws.on("close", () => removeSocket(ws));
  });

  return {
    broadcastRoom,
    handleUpgrade(request, socket, head) {
      if (!request.url?.startsWith("/coop-ws")) {
        socket.destroy();
        return;
      }
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    },
    close() {
      for (const sockets of roomSockets.values()) {
        for (const ws of sockets) ws.close();
      }
      roomSockets.clear();
      wss.close();
    },
  };
}

export function attachCoopRealtime(server: Server): CoopRealtimeHub {
  const hub = createCoopRealtimeHub();
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
