import { describe, expect, it } from "vitest";
import {
  corsOriginForRequest,
  LOCAL_CORS_ORIGINS,
  resolveCorsOrigins,
} from "@/server/cors-config";

describe("CORS configuration", () => {
  it("requires explicit origins in production", () => {
    expect(() => resolveCorsOrigins(undefined, "production")).toThrow(/CORS_ORIGIN/);
    expect(() => resolveCorsOrigins("*", "production")).toThrow(/wildcard/);
    expect(resolveCorsOrigins("https://codex.example.com, https://admin.example.com", "production")).toEqual([
      "https://codex.example.com",
      "https://admin.example.com",
    ]);
  });

  it("uses localhost-only defaults outside production", () => {
    expect(resolveCorsOrigins(undefined, "development")).toEqual(LOCAL_CORS_ORIGINS);
    expect(() => resolveCorsOrigins("*", "development")).toThrow(/wildcard/);
  });

  it("does not reflect an untrusted request origin", () => {
    const allowed = ["https://codex.example.com"];
    expect(corsOriginForRequest(allowed, "https://codex.example.com")).toBe("https://codex.example.com");
    expect(corsOriginForRequest(allowed, "https://evil.example.com")).toBe("");
  });

  it("does not treat an absent Origin as an allowed cross-origin request", () => {
    expect(corsOriginForRequest(["https://codex.example.com"], "")).toBe("");
  });
});
