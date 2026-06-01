"use client";

import { getOrCreateGuestId } from "@/lib/coop/guest-id";
import { catalogFetch } from "@/lib/catalog/catalog-api";

export type FragmentsSessionCard = {
  cardId: string;
  cardName: string;
  imageUrl: string;
  fabSet: string | null;
  rarity: string | null;
};

type RandomCardJsonBody = {
  /** Neutral catalog API */
  id?: string;
  name?: string;
  set?: string;
  /** Legacy alias (deprecated path) */
  cardId?: string;
  cardName?: string;
  fabSet?: string | null;
  imageUrl?: string;
  rarity?: string | null;
  error?: string;
  code?: string;
};

const EMPTY_POOL_COPY =
  "No playable cards match that filter — try all sets or a wider selection.";
const CATALOG_UNAVAILABLE = "The card catalog is not ready yet. Try again in a moment.";
const GENERIC_RETRY = "Something went wrong loading a card. Please try again.";

export function probeImageUrl(url: string, timeoutMs = 5000): Promise<boolean> {
  return new Promise((resolve) => {
    const done = (ok: boolean) => {
      window.clearTimeout(t);
      resolve(ok);
    };
    const t = window.setTimeout(() => done(false), timeoutMs);
    const img = new Image();
    img.onload = () => done(true);
    img.onerror = () => done(false);
    img.referrerPolicy = "no-referrer";
    img.src = url;
  });
}

export async function fetchFragmentsRandomCard(options: {
  selectedSets: string[];
  seed?: string;
  excludeIds: string[];
}): Promise<
  | { ok: true; card: FragmentsSessionCard }
  | { ok: false; friendly: string; code?: string; httpStatus: number; excludeId?: string }
> {
  getOrCreateGuestId();
  const params = new URLSearchParams();
  for (const s of options.selectedSets) {
    const t = s.trim();
    if (t.length > 0) params.append("sets", t);
  }
  if (options.seed != null && options.seed.length > 0) {
    params.set("seed", options.seed);
  }
  for (const id of options.excludeIds) {
    const t = id.trim();
    if (t.length > 0) params.append("exclude", t);
  }

  let res: Response;
  try {
    res = await catalogFetch(`/random-card?${params.toString()}`);
  } catch {
    return { ok: false, friendly: GENERIC_RETRY, httpStatus: 0 };
  }

  let body: RandomCardJsonBody = {};
  try {
    body = (await res.json()) as RandomCardJsonBody;
  } catch {
    body = {};
  }

  const cardId = body.id ?? body.cardId;
  const cardName = body.name ?? body.cardName;
  const imageUrl = body.imageUrl;
  const fabSet = body.set ?? body.fabSet ?? null;
  if (res.ok && cardId && cardName && imageUrl) {
    return {
      ok: true,
      card: {
        cardId,
        cardName,
        imageUrl,
        fabSet,
        rarity: body.rarity ?? null,
      },
    };
  }

  const code = body.code;
  const msg = typeof body.error === "string" && body.error.length > 0 ? body.error : GENERIC_RETRY;
  const excludeFromBody = typeof body.id === "string" ? body.id : body.cardId;

  if (res.status === 404 && code === "no_cards") {
    return { ok: false, friendly: EMPTY_POOL_COPY, code, httpStatus: res.status };
  }

  if (res.status === 503) {
    return { ok: false, friendly: CATALOG_UNAVAILABLE, code: "catalog_unavailable", httpStatus: res.status };
  }

  if (res.status === 422 && code === "no_art" && excludeFromBody) {
    return {
      ok: false,
      friendly: msg,
      code,
      httpStatus: res.status,
      excludeId: excludeFromBody,
    };
  }

  return { ok: false, friendly: msg, code, httpStatus: res.status };
}

/**
 * Picks a random playable printing via `GET /api/catalog/random-card`, probes art in-browser,
 * and retries with exclusions on bad loads.
 */
export async function pickFragmentsPlayableCard(options: {
  selectedFabSets: string[];
  seed: string;
  maxAttempts?: number;
}): Promise<{ ok: true; card: FragmentsSessionCard } | { ok: false; friendly: string }> {
  const maxAttempts = options.maxAttempts ?? 14;
  const exclude = new Set<string>();

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const seed = attempt === 0 ? options.seed : `${options.seed}:r${attempt}`;
    const res = await fetchFragmentsRandomCard({
      selectedSets: options.selectedFabSets,
      seed,
      excludeIds: [...exclude],
    });

    if (res.ok) {
      const loads = await probeImageUrl(res.card.imageUrl);
      if (loads) {
        return { ok: true, card: res.card };
      }
      exclude.add(res.card.cardId);
      continue;
    }

    if (res.excludeId) {
      exclude.add(res.excludeId);
      continue;
    }

    if (res.httpStatus === 404 && res.code === "no_cards") {
      return { ok: false, friendly: res.friendly };
    }

    if (attempt >= maxAttempts - 1) {
      return {
        ok: false,
        friendly:
          res.httpStatus === 503 ? res.friendly : "Could not prepare a card. Try again or adjust your filters.",
      };
    }
  }

  return {
    ok: false,
    friendly: "Card art did not load after several tries. Try again or choose different sets.",
  };
}
