import type { Context } from "hono";
import { Hono } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { RequestIdentityError } from "@/server/auth/request-identity-error";
import { resolvePlayerIdentityForGameRequest } from "@/server/auth/resolve-actor";
import { respondWithCatalogSets } from "@/server/respond-with-catalog-sets";
import {
  getFirstCatalogCardIdByExactName,
  searchPlayableCatalogCardNames,
} from "@/server/services/card-catalog-service";
import { resolveRandomPlayableCatalogCard } from "@/server/services/random-playable-catalog-card";
import {
  forfeitSinglePlayerGame,
  SinglePlayerHttpError,
  startSinglePlayerGame,
  getSinglePlayerGamePublic,
  submitSinglePlayerGuess,
} from "@/server/services/single-player-service";

function handleErr(c: Context, e: unknown) {
  if (e instanceof SinglePlayerHttpError) {
    return c.json({ error: e.message }, e.status as ContentfulStatusCode);
  }
  if (e instanceof RequestIdentityError) {
    return c.json({ error: e.message }, e.status as ContentfulStatusCode);
  }
  throw e;
}

export const singlePlayerRoutes = new Hono()
  /**
   * @deprecated Use `GET /api/catalog/sets` instead. This path remains as a compatibility alias.
   */
  .get("/sets", (c) => respondWithCatalogSets(c))
  /**
   * @deprecated Prefer `GET /api/catalog/random-card` (neutral catalog). This path remains as a
   * compatibility alias mapping to the same resolver; legacy JSON uses `cardId` / `cardName` / `fabSet`.
   */
  .get("/puzzles/random-card", (c) => {
    try {
      const setNames = c.req.queries("sets") ?? [];
      const selectedFabSets = setNames.map((s) => s.trim()).filter((s) => s.length > 0);
      const excludeQs = c.req.queries("exclude") ?? [];
      const exclude = excludeQs.map((s) => s.trim()).filter((s) => s.length > 0);
      const seed = c.req.query("seed")?.trim() ?? undefined;

      const result = resolveRandomPlayableCatalogCard({
        selectedSets: selectedFabSets,
        excludeIds: exclude,
        seed,
      });
      if (!result.ok) {
        const { body, httpStatus } = result.err;
        if (httpStatus === 422 && "id" in body) {
          return c.json(
            { error: body.error, code: body.code, cardId: body.id },
            httpStatus,
          );
        }
        return c.json(body, httpStatus);
      }
      const { card } = result;
      return c.json({
        cardId: card.id,
        cardName: card.name,
        imageUrl: card.imageUrl,
        fabSet: card.set,
        rarity: card.rarity,
      });
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .get("/cards/search", async (c) => {
    try {
      const q = c.req.query("q")?.trim() ?? "";
      if (q.length < 3) {
        return c.json({ names: [] as string[] });
      }
      const names = searchPlayableCatalogCardNames(q, 20);
      return c.json({ names });
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .get("/cards/resolve", async (c) => {
    try {
      const name = c.req.query("name")?.trim() ?? "";
      if (!name) {
        return c.json({ cardId: null as string | null });
      }
      const cardId = getFirstCatalogCardIdByExactName(name);
      return c.json({ cardId });
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .post("/games", async (c) => {
    try {
      const identity = await resolvePlayerIdentityForGameRequest(c.req.raw.headers);
      const body = (await c.req.json().catch(() => ({}))) as {
        selectedFabSets?: string[];
      };
      const raw = Array.isArray(body.selectedFabSets) ? body.selectedFabSets : [];
      const selectedFabSets = raw
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      const out = await startSinglePlayerGame({
        selectedFabSets,
        identity,
      });
      return c.json(out, 201);
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .get("/games/:gameId", async (c) => {
    try {
      const identity = await resolvePlayerIdentityForGameRequest(c.req.raw.headers);
      const gameId = c.req.param("gameId");
      const snap = await getSinglePlayerGamePublic({ gameId, identity });
      return c.json(snap);
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .post("/games/:gameId/guess", async (c) => {
    try {
      const identity = await resolvePlayerIdentityForGameRequest(c.req.raw.headers);
      const gameId = c.req.param("gameId");
      const body = (await c.req.json().catch(() => ({}))) as {
        guessText?: string;
        timeTakenMs?: number;
      };
      const guessText = typeof body.guessText === "string" ? body.guessText : "";
      const timeTakenMs =
        typeof body.timeTakenMs === "number" && Number.isFinite(body.timeTakenMs)
          ? Math.floor(body.timeTakenMs)
          : 0;
      const out = await submitSinglePlayerGuess({
        gameId,
        identity,
        guessText,
        timeTakenMs,
      });
      return c.json(out);
    } catch (e) {
      return handleErr(c, e);
    }
  })
  .post("/games/:gameId/forfeit", async (c) => {
    try {
      const identity = await resolvePlayerIdentityForGameRequest(c.req.raw.headers);
      const gameId = c.req.param("gameId");
      const out = await forfeitSinglePlayerGame({ gameId, identity });
      return c.json(out);
    } catch (e) {
      return handleErr(c, e);
    }
  });
