const STORAGE_KEY = "gac-guest-id";
const TOKEN_STORAGE_KEY = "gac-guest-token";
let tokenRequest: Promise<string> | null = null;

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

/** Gets a server-signed guest token while retaining the stable local guest id for migration. */
export async function getOrCreateGuestToken(): Promise<string> {
  if (typeof window === "undefined") return "";
  const existing = window.localStorage.getItem(TOKEN_STORAGE_KEY);
  if (existing) return existing;
  if (tokenRequest) return tokenRequest;

  tokenRequest = (async () => {
    const res = await fetch("/api/guest/session", {
      method: "POST",
      headers: { "x-guest-id": getOrCreateGuestId() },
    });
    if (!res.ok) throw new Error("Could not establish guest session.");
    const body = (await res.json()) as { token?: string };
    if (!body.token) throw new Error("Guest session response was invalid.");
    window.localStorage.setItem(TOKEN_STORAGE_KEY, body.token);
    return body.token;
  })();

  try {
    return await tokenRequest;
  } finally {
    tokenRequest = null;
  }
}
