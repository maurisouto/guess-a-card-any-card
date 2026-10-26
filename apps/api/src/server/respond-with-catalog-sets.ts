import type { Context } from "hono";
import { getAllSets, isCardCatalogReady } from "@/server/services/card-catalog-service";

/**
 * Shared handler for catalog set listing — FAB release names from the in-memory playable catalog.
 * Primary route: `GET /api/catalog/sets`. Single/coop/competitive aliases call this handler too.
 */
export function respondWithCatalogSets(c: Context) {
  if (!isCardCatalogReady()) {
    return c.json(
      { error: "Card catalog is unavailable. Try again shortly." },
      503,
    );
  }
  return c.json({ sets: getAllSets() });
}
