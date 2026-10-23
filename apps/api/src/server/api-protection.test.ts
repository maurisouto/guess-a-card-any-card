import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { createApiProtectionMiddleware } from "@/server/api-protection";

function app(options: Parameters<typeof createApiProtectionMiddleware>[0]) {
  const api = new Hono();
  api.use("/*", createApiProtectionMiddleware(options));
  api.post("/payload", (c) => c.json({ ok: true }));
  api.get("/health", (c) => c.json({ ok: true }));
  return api;
}

describe("API protection middleware", () => {
  it("limits requests per caller and exposes reset headers", async () => {
    const api = app({ maxRequests: 2, windowMs: 60_000 });
    const first = await api.request("http://localhost/health");
    const second = await api.request("http://localhost/health");
    const third = await api.request("http://localhost/health");

    expect(first.status).toBe(200);
    expect(second.headers.get("x-ratelimit-remaining")).toBe("0");
    expect(third.status).toBe(429);
    expect(third.headers.get("retry-after")).toBeTruthy();
  });

  it("keeps authenticated callers on separate buckets", async () => {
    const api = app({ maxRequests: 1, windowMs: 60_000 });
    const first = await api.request("http://localhost/health", {
      headers: { authorization: "Bearer token-a" },
    });
    const second = await api.request("http://localhost/health", {
      headers: { authorization: "Bearer token-b" },
    });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
  });

  it("rejects declared and chunked bodies above the configured limit", async () => {
    const api = app({ maxRequests: 10, maxBodyBytes: 4 });
    const declared = await api.request("http://localhost/payload", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "5" },
      body: "12345",
    });
    const chunked = await api.request("http://localhost/payload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("12345"));
          controller.close();
        },
      }),
      duplex: "half",
    });

    expect(declared.status).toBe(413);
    expect(chunked.status).toBe(413);
  });
});
