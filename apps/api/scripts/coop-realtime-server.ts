/**
 * Native coop WebSocket server (Prompt 8) — runs beside Next.js (separate port).
 *
 *   COOP_REALTIME_PORT=3010 npm run realtime:dev
 *
 * Subscribes: `ws://host:3010/coop-ws` then send
 * `{"type":"subscribe","roomId":"<uuid>","guestId":"<x-guest-id>","protocol":1}`.
 */
import "../src/load-env";
import { createServer, type IncomingMessage } from "node:http";
import { attachCoopRealtime } from "../src/server/realtime/coop-realtime";

const PORT = Number(process.env.COOP_REALTIME_PORT ?? "3010") || 3010;
const NOTIFY_SECRET = process.env.COOP_REALTIME_SECRET?.trim();

function readNotifyBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c as Buffer));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/notify") {
    if (NOTIFY_SECRET) {
      const auth = req.headers.authorization?.trim();
      if (auth !== `Bearer ${NOTIFY_SECRET}`) {
        res.writeHead(401).end("Unauthorized");
        return;
      }
    }

    let body: string;
    try {
      body = await readNotifyBody(req);
    } catch {
      res.writeHead(400).end("Bad body");
      return;
    }

    let roomId: string;
    try {
      const j = JSON.parse(body) as { roomId?: string };
      roomId = typeof j.roomId === "string" ? j.roomId.trim() : "";
    } catch {
      res.writeHead(400).end("Invalid JSON");
      return;
    }

    if (!roomId) {
      res.writeHead(400).end("Missing roomId");
      return;
    }

    await realtime.broadcastRoom(roomId);
    res.writeHead(204).end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404).end();
});

const realtime = attachCoopRealtime(server);

server.listen(PORT, () => {
  console.log(
    `[coop-realtime] listening :${PORT} ws=/coop-ws notify=POST /notify health=GET /health`,
  );
});
