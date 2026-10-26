import "./load-env";
import { createApiNodeServer } from "./server/node-server";

const port = Number(process.env.PORT ?? process.env.API_PORT ?? "8787") || 8787;
const { server } = createApiNodeServer();

server.listen(port, () => {
  console.log(
    `[gac-api] http://127.0.0.1:${port}/api/health (http + coop ws /coop-ws)`,
  );
});
