import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const TOKEN_PREFIX = "g1";
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export class GuestSessionError extends Error {
  readonly status = 401;

  constructor(message = "Invalid or expired guest session.") {
    super(message);
    this.name = "GuestSessionError";
  }
}

function getSecret(): string {
  const configured = process.env.GUEST_TOKEN_SECRET?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new GuestSessionError("Guest sessions are not configured.");
  }
  return "local-development-guest-token-secret";
}

function encode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function issueGuestSession(guestId?: string): {
  guestId: string;
  token: string;
  expiresAt: string;
} {
  const resolvedGuestId = guestId ?? randomUUID();
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + TOKEN_TTL_SECONDS;
  const payload = encode(JSON.stringify({ guestId: resolvedGuestId, issuedAt, expiresAt }));
  return {
    guestId: resolvedGuestId,
    token: `${TOKEN_PREFIX}.${payload}.${sign(payload)}`,
    expiresAt: new Date(expiresAt * 1000).toISOString(),
  };
}

export function verifyGuestSession(token: string): string | null {
  const parts = token.trim().split(".");
  if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) return null;
  const payload = parts[1]!;
  const suppliedSignature = parts[2]!;
  const expectedSignature = sign(payload);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      guestId?: unknown;
      expiresAt?: unknown;
    };
    if (
      typeof parsed.guestId !== "string" ||
      parsed.guestId.length < 16 ||
      typeof parsed.expiresAt !== "number" ||
      parsed.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return parsed.guestId;
  } catch {
    return null;
  }
}

/** Resolve the wire header while keeping legacy raw IDs usable outside production. */
export function resolveGuestSessionValue(raw: string | undefined): string {
  const value = raw?.trim() ?? "";
  if (!value) throw new GuestSessionError("Missing X-Guest-Id header.");

  const verified = verifyGuestSession(value);
  if (verified) return verified;

  const allowLegacy =
    process.env.NODE_ENV !== "production" || process.env.ALLOW_LEGACY_GUEST_IDS === "true";
  if (allowLegacy && value.length <= 200) return value;
  throw new GuestSessionError();
}
