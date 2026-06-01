import type { Context } from "hono";
import { Hono } from "hono";
import { respondWithCatalogSets } from "@/server/respond-with-catalog-sets";
import { resolveRandomPlayableCatalogCard } from "@/server/services/random-playable-catalog-card";

function parseRandomCardQuery(c: Context) {
  const setNames = c.req.queries("sets") ?? [];
  const selectedSets = setNames.map((s) => s.trim()).filter((s) => s.length > 0);
  const excludeQs = c.req.queries("exclude") ?? [];
  const excludeIds = excludeQs.map((s) => s.trim()).filter((s) => s.length > 0);
  const seed = c.req.query("seed")?.trim() ?? undefined;
  return { selectedSets, excludeIds, seed };
}

/**
 * Platform-neutral card catalog HTTP surface (not Guess-, single-, or puzzle-specific).
 */
export const catalogRoutes = new Hono()
  .get("/sets", (c) => respondWithCatalogSets(c))
  .get("/random-card", (c) => {
    const { selectedSets, excludeIds, seed } = parseRandomCardQuery(c);
    const result = resolveRandomPlayableCatalogCard({ selectedSets, excludeIds, seed });
    if (result.ok) {
      return c.json(result.card);
    }
    return c.json(result.err.body, result.err.httpStatus);
  });
