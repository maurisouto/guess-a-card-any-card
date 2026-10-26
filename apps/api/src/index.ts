import "./load-env";
import { closeApiNodeServer, createApiNodeServer } from "./server/node-server";

const port = Number(process.env.PORT ?? process.env.API_PORT ?? "8787") || 8787;
const api = createApiNodeServer();
const { server } = api;

let shuttingDown = false;
async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[gac-api] received ${signal}; shutting down`);
  try {
    await closeApiNodeServer(api);
  } catch (error) {
    console.error("[gac-api] graceful shutdown failed", error);
    process.exitCode = 1;
  }
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

server.listen(port, () => {
  console.log(
    `[gac-api] http://127.0.0.1:${port}/api/health (http + coop ws /coop-ws)`,
  );
});
