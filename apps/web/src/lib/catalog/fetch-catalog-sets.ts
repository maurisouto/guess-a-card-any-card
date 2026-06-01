"use client";

import { getOrCreateGuestId } from "@/lib/coop/guest-id";

import { catalogFetch } from "./catalog-api";

/** Read-only list of FAB release names from `GET /api/catalog/sets`. */
export async function fetchCatalogSetsList(): Promise<
  { ok: true; sets: string[] } | { ok: false; status: number }
> {
  getOrCreateGuestId();
  const res = await catalogFetch("/sets");
  if (!res.ok) {
    return { ok: false, status: res.status };
  }
  const j = (await res.json()) as { sets?: string[] };
  return { ok: true, sets: j.sets ?? [] };
}
