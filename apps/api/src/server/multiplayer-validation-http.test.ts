import { describe, expect, it } from "vitest";
import { issueGuestSession } from "@/server/auth/guest-session";
import { app } from "@/server/http-app";

const guestHeaders = () => ({
  "Content-Type": "application/json",
  "x-guest-id": issueGuestSession("validation-http-guest").token,
});

describe("multiplayer route validation", () => {
  it.each(["/api/coop/rooms", "/api/competitive/rooms"])(
    "%s rejects missing, empty and oversized display names before persistence",
    async (path) => {
      for (const body of [{}, { displayName: "   " }, { displayName: "x".repeat(81) }]) {
        const response = await app.request(`http://localhost${path}`, {
          method: "POST",
          headers: guestHeaders(),
          body: JSON.stringify(body),
        });
        expect(response.status).toBe(400);
        await expect(response.json()).resolves.toMatchObject({ error: expect.any(String) });
      }
    },
  );

  it.each([
    "/api/coop/rooms/not-a-uuid/sets",
    "/api/competitive/rooms/not-a-uuid/timer",
    "/api/coop/games/not-a-uuid/guess",
    "/api/competitive/games/not-a-uuid/guess",
  ])("rejects malformed route identifiers with 400: %s", async (path) => {
    const response = await app.request(`http://localhost${path}`, {
      method: path.endsWith("sets") || path.endsWith("timer") ? "PATCH" : "POST",
      headers: guestHeaders(),
      body: JSON.stringify({ guessText: "Card", timeTakenMs: 10 }),
    });
    expect(response.status).toBe(400);
  });

  it.each(["/api/coop/games/123e4567-e89b-12d3-a456-426614174000/guess", "/api/competitive/games/123e4567-e89b-12d3-a456-426614174000/guess"])(
    "%s rejects invalid guess payloads before reaching gameplay services",
    async (path) => {
      for (const body of [
        {},
        { guessText: "   ", timeTakenMs: 10 },
        { guessText: "Card", timeTakenMs: -1 },
        { guessText: "Card", timeTakenMs: 1.5 },
        { guessText: "Card", timeTakenMs: 86_400_001 },
        { guessText: "Card", timeTakenMs: "10" },
      ]) {
        const response = await app.request(`http://localhost${path}`, {
          method: "POST",
          headers: guestHeaders(),
          body: JSON.stringify(body),
        });
        expect(response.status).toBe(400);
      }
    },
  );
});
