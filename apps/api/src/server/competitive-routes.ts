import type { Context } from "hono";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { respondWithCatalogSets } from "@/server/respond-with-catalog-sets";
import {
  CompetitiveHttpError,
  createCompetitiveRoom,
  getCompetitiveRoomPublic,
  joinCompetitiveRoom,
  leaveCompetitiveRoom,
  startCompetitiveGame,
  submitCompetitiveGuess,
  updateCompetitiveSelectedSets,
  updateCompetitiveTimer,
} from "@/server/services/competitive-service";
import { resolveGuestSessionValue } from "@/server/auth/guest-session";
import { getAllSets } from "@/server/services/card-catalog-service";
import {
  MultiplayerInputError,
  parseDisplayName,
  parseGuessInput,
  parseMultiplayerJsonBody,
  parseSelectedSets,
  parseTimerPerStepSeconds,
  requireUuid,
} from "@/server/multiplayer-input";

function requireGuestHeader(c: { req: { header: (n: string) => string | undefined } }): string {
  try {
    return resolveGuestSessionValue(c.req.header("x-guest-id"));
  } catch (e) {
    throw new CompetitiveHttpError(401, e instanceof Error ? e.message : "Invalid guest session.");
  }
}

function handleErr(c: Context, e: unknown) {
  if (e instanceof MultiplayerInputError) {
    return c.json({ error: e.message }, 400);
  }
  if (e instanceof CompetitiveHttpError) {
    return c.json({ error: e.message }, e.status as ContentfulStatusCode);
  }
  throw e;
}

export const competitiveRoutes = new Hono()
  .get("/sets", (c) => respondWithCatalogSets(c))
  .post("/rooms", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const body = await parseMultiplayerJsonBody(c.req);
      const out = await createCompetitiveRoom({
        hostGuestId: guestId,
        displayName: parseDisplayName(body),
      });
      return c.json(out, 201);
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .post("/rooms/:roomId/join", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = requireUuid(c.req.param("roomId"), "roomId");
      const body = await parseMultiplayerJsonBody(c.req);
      await joinCompetitiveRoom({
        roomId,
        guestId,
        displayName: parseDisplayName(body),
      });
      return c.json({ ok: true });
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .get("/rooms/:roomId", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = requireUuid(c.req.param("roomId"), "roomId");
      const snap = await getCompetitiveRoomPublic({ roomId, viewerGuestId: guestId });
      return c.json(snap);
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .patch("/rooms/:roomId/sets", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = requireUuid(c.req.param("roomId"), "roomId");
      const body = await parseMultiplayerJsonBody(c.req);
      const selectedSets = parseSelectedSets(body, getAllSets());
      await updateCompetitiveSelectedSets({ roomId, hostGuestId: guestId, selectedSets });
      return c.json({ ok: true });
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .patch("/rooms/:roomId/timer", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = requireUuid(c.req.param("roomId"), "roomId");
      const body = await parseMultiplayerJsonBody(c.req);
      const t = parseTimerPerStepSeconds(body);
      await updateCompetitiveTimer({ roomId, hostGuestId: guestId, timerPerStepSeconds: t });
      return c.json({ ok: true });
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .post("/rooms/:roomId/start", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = requireUuid(c.req.param("roomId"), "roomId");
      const out = await startCompetitiveGame({ roomId, hostGuestId: guestId });
      return c.json(out, 201);
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .post("/rooms/:roomId/leave", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = requireUuid(c.req.param("roomId"), "roomId");
      await leaveCompetitiveRoom({ roomId, guestId });
      return c.json({ ok: true });
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .post("/games/:gameId/guess", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const gameId = requireUuid(c.req.param("gameId"), "gameId");
      const body = await parseMultiplayerJsonBody(c.req);
      const { guessText, timeTakenMs } = parseGuessInput(body);
      await submitCompetitiveGuess({ gameId, guestId, guessText, timeTakenMs });
      return c.json({ ok: true });
    } catch (e) {
      return handleErr(c, e);
    }
  });
