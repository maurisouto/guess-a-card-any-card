const STORAGE_KEY = "gac-guest-id";
const TOKEN_STORAGE_KEY = "gac-guest-token";
let tokenRequest: Promise<string> | null = null;
let guestToken: string | null = null;
let tokenInitializationFailure: Error | null = null;

/** Stable anonymous id for COOP REST (until Supabase auth is wired). */
export function getOrCreateGuestId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

function clearPersistedGuestSession(): void {
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function guestSessionFailure(context: string, status: number | null): Error {
  const statusLabel = status === null ? "network error (no HTTP status)" : `HTTP ${status}`;
  console.error(`[gac] Guest session initialization failed during ${context}: ${statusLabel}.`);
  return new Error("Could not establish guest session.");
}

async function establishGuestSession(existingToken: string | null): Promise<string> {
  const request: RequestInit = { method: "POST" };
  if (existingToken) request.headers = { "x-guest-id": existingToken };
  const firstResponse = await fetch("/api/guest/session", request);

  let response = firstResponse;
  if (firstResponse.status === 401) {
    clearPersistedGuestSession();
    response = await fetch("/api/guest/session", { method: "POST" });
  }

  if (!response.ok) {
    throw guestSessionFailure(
      response === firstResponse ? "initial request" : "recovery request",
      response.status,
    );
  }

  let body: { guestId?: string; token?: string };
  try {
    body = (await response.json()) as { guestId?: string; token?: string };
  } catch {
    throw guestSessionFailure(
      response === firstResponse ? "initial response" : "recovery response",
      response.status,
    );
  }
  if (!body.token) {
    throw guestSessionFailure(
      response === firstResponse ? "initial response" : "recovery response",
      response.status,
    );
  }
  if (body.guestId) {
    window.localStorage.setItem(STORAGE_KEY, body.guestId);
  }
  window.localStorage.setItem(TOKEN_STORAGE_KEY, body.token);
  guestToken = body.token;
  return body.token;
}

/** Gets a server-signed guest token while retaining the stable local guest id for migration. */
export async function getOrCreateGuestToken(): Promise<string> {
  if (typeof window === "undefined") return "";
  if (guestToken) return guestToken;
  const existing = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (tokenInitializationFailure) throw tokenInitializationFailure;
  if (tokenRequest) return tokenRequest;

  tokenRequest = establishGuestSession(existing).catch((error: unknown) => {
    const failure = error instanceof Error
      ? error
      : guestSessionFailure("request", null);
    tokenInitializationFailure = failure;
    if (error instanceof TypeError) {
      console.error("[gac] Guest session initialization failed during request: network error (no HTTP status).");
    }
    throw failure;
  });

  try {
    return await tokenRequest;
  } finally {
    tokenRequest = null;
  }
}
