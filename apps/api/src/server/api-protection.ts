import { createHash } from "node:crypto";
import type { Context, MiddlewareHandler } from "hono";

export type ApiProtectionOptions = {
  maxRequests?: number;
  windowMs?: number;
  maxBodyBytes?: number;
};

type RateLimitEntry = { count: number; resetAt: number };

const DEFAULT_MAX_REQUESTS = 120;
const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_BODY_BYTES = 1_048_576;

function positiveEnvInt(name: string, fallback: number): number {
  const value = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function requestKey(request: Request): string {
  const identity =
    request.headers.get("authorization")?.trim() ||
    request.headers.get("x-guest-id")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "anonymous";
  return createHash("sha256").update(identity).digest("hex").slice(0, 32);
}

function withRateLimitHeaders(response: Response, limit: number, remaining: number, resetAt: number): Response {
  response.headers.set("X-RateLimit-Limit", String(limit));
  response.headers.set("X-RateLimit-Remaining", String(Math.max(0, remaining)));
  response.headers.set("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
  return response;
}

async function enforceBodyLimit(
  c: Context,
  maxBodyBytes: number,
): Promise<boolean> {
  const request = c.req.raw;
  if (!/^(POST|PUT|PATCH)$/i.test(request.method) || !request.body) return false;

  const contentLength = request.headers.get("content-length");
  if (contentLength != null) {
    const declared = Number.parseInt(contentLength, 10);
    if (!Number.isFinite(declared) || declared < 0 || declared > maxBodyBytes) return true;
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > maxBodyBytes) {
        await reader.cancel();
        return true;
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  c.req.raw = new Request(request, { body });
  return false;
}

export function createApiProtectionMiddleware(options: ApiProtectionOptions = {}): MiddlewareHandler {
  const maxRequests = options.maxRequests ?? positiveEnvInt("API_RATE_LIMIT_MAX", DEFAULT_MAX_REQUESTS);
  const windowMs = options.windowMs ?? positiveEnvInt("API_RATE_LIMIT_WINDOW_MS", DEFAULT_WINDOW_MS);
  const maxBodyBytes = options.maxBodyBytes ?? positiveEnvInt("API_MAX_BODY_BYTES", DEFAULT_MAX_BODY_BYTES);
  const entries = new Map<string, RateLimitEntry>();
  let lastCleanupAt = 0;

  return async (c, next) => {
    const now = Date.now();
    if (now - lastCleanupAt > windowMs) {
      lastCleanupAt = now;
      for (const [key, entry] of entries) {
        if (entry.resetAt <= now) entries.delete(key);
      }
    }

    const key = requestKey(c.req.raw);
    const existing = entries.get(key);
    const entry = existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + windowMs };
    entry.count += 1;
    entries.set(key, entry);
    const remaining = maxRequests - entry.count;

    if (entry.count > maxRequests) {
      const response = c.json({ error: "Too many requests. Try again later." }, 429);
      response.headers.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
      return withRateLimitHeaders(response, maxRequests, 0, entry.resetAt);
    }

    if (await enforceBodyLimit(c, maxBodyBytes)) {
      return withRateLimitHeaders(
        c.json({ error: "Request body is too large." }, 413),
        maxRequests,
        remaining,
        entry.resetAt,
      );
    }

    await next();
    return withRateLimitHeaders(c.res, maxRequests, remaining, entry.resetAt);
  };
}
