"use client";

import { buildGameApiRequestHeaders } from "@/lib/auth/game-api-headers";

/**
 * Fetch for platform-neutral catalog routes (`/api/catalog/...`).
 * Uses the same actor headers as game modes so behavior stays consistent behind the proxy.
 */
export async function catalogFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = await buildGameApiRequestHeaders(init?.headers);
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`/api/catalog${path}`, { ...init, headers });
}
