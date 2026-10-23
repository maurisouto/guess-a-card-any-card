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

initCardCatalog();

const configuredOrigins =
  process.env.CORS_ORIGIN?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) ?? null;

if (process.env.NODE_ENV === "production" && (!configuredOrigins || configuredOrigins.length === 0)) {
  throw new Error("CORS_ORIGIN must be configured in production.");
}
if (process.env.NODE_ENV === "production" && !process.env.GUEST_TOKEN_SECRET?.trim()) {
  throw new Error("GUEST_TOKEN_SECRET must be configured in production.");
}

const allowedOrigins =
  configuredOrigins && configuredOrigins.length > 0
    ? configuredOrigins
    : ["http://localhost:3000", "http://127.0.0.1:3000"];

const app = new Hono().basePath("/api");

app.use(
  "/*",
  cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : ""),
    allowHeaders: ["Content-Type", "Authorization", "x-guest-id"],
  }),
);

app.get("/health", (c) =>
  c.json({ ok: true, service: "guess-a-card-any-card-api" }),
);

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
