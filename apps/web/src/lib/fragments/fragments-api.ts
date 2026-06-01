"use client";

import { buildGameApiRequestHeaders } from "@/lib/auth/game-api-headers";
import type {
  FragmentsLeaderboardResponse,
  FragmentsProfileResponse,
} from "@/lib/fragments/types";

type FragmentsCompletionPayload = {
  runId: string;
  cardId: string;
  cardName: string;
  cardImageUrl: string;
  fabSet: string | null;
  rarity: string | null;
  puzzleMode: "fragments" | "sliding";
  difficulty: "easy" | "normal" | "hard";
  timeMs: number;
  moves: number;
  seed: string;
  templateId: string | null;
};

function parseApiError(res: Response, body: string): Error {
  if ((res.headers.get("content-type") ?? "").includes("text/html")) {
    return new Error(`API unavailable (${res.status})`);
  }
  return new Error(body || `HTTP ${res.status}`);
}

export async function postFragmentsCompletion(
  payload: FragmentsCompletionPayload,
): Promise<{ persisted: boolean }> {
  const headers = await buildGameApiRequestHeaders();
  headers.set("Content-Type", "application/json");
  const res = await fetch("/api/fragments/completions", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw parseApiError(res, await res.text());
  }
  return (await res.json()) as { persisted: boolean };
}

export async function fetchFragmentsProfileMe(): Promise<FragmentsProfileResponse> {
  const headers = await buildGameApiRequestHeaders();
  const res = await fetch("/api/fragments/profile/me", { headers, cache: "no-store" });
  if (res.status === 401) {
    throw new Error("unauthorized");
  }
  if (!res.ok) {
    throw parseApiError(res, await res.text());
  }
  return (await res.json()) as FragmentsProfileResponse;
}

export async function fetchPublicFragmentsProfile(
  userId: string,
): Promise<FragmentsProfileResponse> {
  const res = await fetch(`/api/fragments/profile/${encodeURIComponent(userId)}`, {
    cache: "no-store",
  });
  if (res.status === 404) {
    throw new Error("not_found");
  }
  if (!res.ok) {
    throw parseApiError(res, await res.text());
  }
  return (await res.json()) as FragmentsProfileResponse;
}

export type FragmentsLeaderboardQuery = {
  category: string;
  mode?: string;
  difficulty?: string;
  limit?: number;
  offset?: number;
};

export async function fetchFragmentsLeaderboard(
  q: FragmentsLeaderboardQuery,
): Promise<FragmentsLeaderboardResponse> {
  const params = new URLSearchParams();
  params.set("category", q.category);
  if (q.mode) params.set("mode", q.mode);
  if (q.difficulty) params.set("difficulty", q.difficulty);
  if (q.limit != null) params.set("limit", String(q.limit));
  if (q.offset != null) params.set("offset", String(q.offset));
  const res = await fetch(`/api/fragments/leaderboards?${params.toString()}`, { cache: "no-store" });
  if (res.status === 400) {
    throw parseApiError(res, await res.text());
  }
  if (!res.ok) {
    throw parseApiError(res, await res.text());
  }
  return (await res.json()) as FragmentsLeaderboardResponse;
}
