"use client";

import { getOrCreateGuestToken } from "@/lib/coop/guest-id";

export async function coopFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  headers.set("x-guest-id", await getOrCreateGuestToken());
  if (init?.body != null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`/api/coop${path}`, { ...init, headers });
}
