import type { Context } from "hono";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
  CoopHttpError,
  createCoopRoom,
  dismissCoopCircleByHostAfterGame,
  getCoopRoomPublic,
  hostEndCoopGame,
  joinCoopRoom,
  leaveCoopRoom,
  setCoopPlayerConnected,
  startCoopGame,
  submitCoopGuess,
  updateCoopSelectedSets,
} from "@/server/services/coop-service";
import { respondWithCatalogSets } from "@/server/respond-with-catalog-sets";
import { resolveGuestSessionValue } from "@/server/auth/guest-session";
import { getAllSets } from "@/server/services/card-catalog-service";
import {
  MultiplayerInputError,
  parseDisplayName,
  parseGuessInput,
  parseMultiplayerJsonBody,
  parseSelectedSets,
  requireUuid,
} from "@/server/multiplayer-input";

function requireGuestHeader(c: { req: { header: (n: string) => string | undefined } }): string {
  try {
    return resolveGuestSessionValue(c.req.header("x-guest-id"));
  } catch (e) {
    throw new CoopHttpError(401, e instanceof Error ? e.message : "Invalid guest session.");
  }
}

function handleCoopErr(c: Context, e: unknown) {
  if (e instanceof MultiplayerInputError) {
    return c.json({ error: e.message }, 400);
  }
  if (e instanceof CoopHttpError) {
    return c.json({ error: e.message }, e.status as ContentfulStatusCode);
  }
  throw e;
}

export const coopRoutes = new Hono()
  .get("/sets", (c) => respondWithCatalogSets(c))
  .post("/rooms", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const body = await parseMultiplayerJsonBody(c.req);
      const r = await createCoopRoom({
        hostGuestId: guestId,
        displayName: parseDisplayName(body),
      });
      return c.json(r, 201);
    } catch (e) {
      return handleCoopErr(c, e);
    }
  })
  .post("/rooms/:roomId/join", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = requireUuid(c.req.param("roomId"), "roomId");
      const body = await parseMultiplayerJsonBody(c.req);
      await joinCoopRoom({
        roomId,
        guestId,
        displayName: parseDisplayName(body),
      });
      return c.json({ ok: true });
    } catch (e) {
      return handleCoopErr(c, e);
    }
  })
  .get("/rooms/:roomId", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = requireUuid(c.req.param("roomId"), "roomId");
      const snap = await getCoopRoomPublic({ roomId, viewerGuestId: guestId });
      return c.json(snap);
    } catch (e) {
      return handleCoopErr(c, e);
    }
  })
  .patch("/rooms/:roomId/sets", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = requireUuid(c.req.param("roomId"), "roomId");
      const body = await parseMultiplayerJsonBody(c.req);
      const selectedSets = parseSelectedSets(body, getAllSets());
      await updateCoopSelectedSets({ roomId, hostGuestId: guestId, selectedSets });
      return c.json({ ok: true });
    } catch (e) {
      return handleCoopErr(c, e);
    }
  })
  .post("/rooms/:roomId/start", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = requireUuid(c.req.param("roomId"), "roomId");
      const out = await startCoopGame({ roomId, hostGuestId: guestId });
      return c.json(out);
    } catch (e) {
      return handleCoopErr(c, e);
    }
  })
  .post("/rooms/:roomId/leave", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = requireUuid(c.req.param("roomId"), "roomId");
      await leaveCoopRoom({ roomId, guestId });
      return c.json({ ok: true });
    } catch (e) {
      return handleCoopErr(c, e);
    }
  })
  .post("/rooms/:roomId/end-game", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = requireUuid(c.req.param("roomId"), "roomId");
      await hostEndCoopGame({ roomId, hostGuestId: guestId });
      return c.json({ ok: true });
    } catch (e) {
      return handleCoopErr(c, e);
    }
  })
  .post("/rooms/:roomId/dismiss-after-game", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = requireUuid(c.req.param("roomId"), "roomId");
      await dismissCoopCircleByHostAfterGame({ roomId, hostGuestId: guestId });
      return c.json({ ok: true });
    } catch (e) {
      return handleCoopErr(c, e);
    }
  })
  .patch("/rooms/:roomId/players/:playerId/connection", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const roomId = requireUuid(c.req.param("roomId"), "roomId");
      const targetRoomPlayerId = requireUuid(c.req.param("playerId"), "playerId");
      const body = await parseMultiplayerJsonBody(c.req);
      if (typeof body.isConnected !== "boolean") {
        throw new MultiplayerInputError("Body must include boolean isConnected.");
      }
      await setCoopPlayerConnected({
        roomId,
        hostGuestId: guestId,
        targetRoomPlayerId,
        isConnected: body.isConnected,
      });
      return c.json({ ok: true });
    } catch (e) {
      return handleCoopErr(c, e);
    }
  })
  .post("/games/:gameId/guess", async (c) => {
    try {
      const guestId = requireGuestHeader(c);
      const gameId = requireUuid(c.req.param("gameId"), "gameId");
      const body = await parseMultiplayerJsonBody(c.req);
      const { guessText, timeTakenMs } = parseGuessInput(body);
      const out = await submitCoopGuess({ gameId, submitterGuestId: guestId, guessText, timeTakenMs });
      return c.json(out);
    } catch (e) {
      return handleCoopErr(c, e);
    }
  });
