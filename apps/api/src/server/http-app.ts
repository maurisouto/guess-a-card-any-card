import { Hono } from "hono";
import { cors } from "hono/cors";
import { challengeRoutes } from "@/server/challenge-routes";
import { competitiveRoutes } from "@/server/competitive-routes";
import { coopRoutes } from "@/server/coop-routes";
import { fragmentsRoutes } from "@/server/fragments-routes";
import { leaderboardRoutes } from "@/server/leaderboard-routes";
import { meRoutes } from "@/server/me-routes";
import { profileRoutes } from "@/server/profile-routes";
import { catalogRoutes } from "@/server/catalog-routes";
import { singlePlayerRoutes } from "@/server/single-player-routes";
import { guestRoutes } from "@/server/guest-routes";
import { initCardCatalog } from "@/server/services/card-catalog-service";
import { createApiProtectionMiddleware } from "@/server/api-protection";
import { corsOriginForRequest, resolveCorsOrigins } from "@/server/cors-config";
import { getApplicationLifecycleState } from "@/server/app-lifecycle";
import { isApplicationReady } from "@/server/readiness";

initCardCatalog();

if (process.env.NODE_ENV === "production" && !process.env.GUEST_TOKEN_SECRET?.trim()) {
  throw new Error("GUEST_TOKEN_SECRET must be configured in production.");
}

const allowedOrigins = resolveCorsOrigins(process.env.CORS_ORIGIN, process.env.NODE_ENV);

const app = new Hono().basePath("/api");

app.use("/*", createApiProtectionMiddleware());

app.use(
  "/*",
  cors({
    origin: (origin) => corsOriginForRequest(allowedOrigins, origin),
    allowHeaders: ["Content-Type", "Authorization", "x-guest-id"],
  }),
);

app.get("/health", (c) =>
  c.json({ ok: true, service: "guess-a-card-any-card-api" }),
);

app.get("/ready", async (c) => {
  const ready = await isApplicationReady();
  return c.json({ ok: ready, ready }, ready ? 200 : 503);
});

app.use("/*", async (c, next) => {
  const state = getApplicationLifecycleState();
  if (state === "shutting_down" || state === "stopped") {
    return c.json({ error: "Service is shutting down." }, 503);
  }
  await next();
});

app.route("/me", meRoutes);
app.route("/profile", profileRoutes);
app.route("/leaderboard", leaderboardRoutes);
app.route("/coop", coopRoutes);
app.route("/competitive", competitiveRoutes);
app.route("/challenges", challengeRoutes);
app.route("/catalog", catalogRoutes);
app.route("/fragments", fragmentsRoutes);
app.route("/single", singlePlayerRoutes);
app.route("/guest", guestRoutes);

export { app };
