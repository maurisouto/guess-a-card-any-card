import { resolveCatalogCardArtUrl } from "@/lib/card-art-url";
import { getRandomCard, isCardCatalogReady } from "@/server/services/card-catalog-service";

/**
 * Neutral DTO for “one random playable printing” — shared by catalog HTTP routes and future Codex games.
 * (No session, persistence, or mode-specific fields.)
 */
export type RandomPlayableCatalogCardDto = {
  id: string;
  name: string;
  imageUrl: string;
  /** FAB release key (same as catalog `setKey`). */
  set: string;
  rarity: string;
};

export type RandomPlayableCatalogCardError =
  | {
      httpStatus: 503;
      body: { error: string; code?: "catalog_unavailable" };
    }
  | {
      httpStatus: 404;
      body: { error: string; code: "no_cards" };
    }
  | {
      httpStatus: 422;
      body: { error: string; code: "no_art"; id: string };
    };

const CATALOG_UNAVAILABLE = "Card catalog is unavailable. Try again shortly.";
const NO_CARDS_FILTERED =
  "No playable card matches those sets — try a wider selection or all sets.";
const NO_CARDS_GLOBAL = "No playable card found in the catalog.";
const NO_ART = "Card has no resolvable art URL.";

/**
 * Picks one random playable catalog row with the same rules as multiplayer/single game starts:
 * {@link getRandomCard} (set filter, exclude list, optional deterministic seed over a sorted pool).
 */
export function resolveRandomPlayableCatalogCard(params: {
  selectedSets: readonly string[];
  excludeIds: readonly string[];
  seed?: string;
}):
  | { ok: true; card: RandomPlayableCatalogCardDto }
  | { ok: false; err: RandomPlayableCatalogCardError } {
  if (!isCardCatalogReady()) {
    return {
      ok: false,
      err: {
        httpStatus: 503,
        body: { error: CATALOG_UNAVAILABLE, code: "catalog_unavailable" },
      },
    };
  }

  const catalogCard = getRandomCard(params.selectedSets, params.excludeIds, params.seed);
  if (!catalogCard) {
    return {
      ok: false,
      err: {
        httpStatus: 404,
        body: {
          error: params.selectedSets.length > 0 ? NO_CARDS_FILTERED : NO_CARDS_GLOBAL,
          code: "no_cards",
        },
      },
    };
  }

  const imageUrl = resolveCatalogCardArtUrl(catalogCard.imageUrl, catalogCard.printing);
  if (!imageUrl) {
    return {
      ok: false,
      err: {
        httpStatus: 422,
        body: { error: NO_ART, code: "no_art", id: catalogCard.id },
      },
    };
  }

  return {
    ok: true,
    card: {
      id: catalogCard.id,
      name: catalogCard.name,
      imageUrl,
      set: catalogCard.setKey,
      rarity: String(catalogCard.printing.rarity),
    },
  };
}
