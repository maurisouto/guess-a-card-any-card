import { afterEach, describe, expect, it } from "vitest";
import {
  issueGuestSession,
  resolveGuestSessionValue,
  verifyGuestSession,
} from "@/server/auth/guest-session";

describe("guest sessions", () => {
  afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.ALLOW_LEGACY_GUEST_IDS;
  });

  it("issues and verifies a signed guest token", () => {
    const issued = issueGuestSession("guest-1234567890");
    expect(verifyGuestSession(issued.token)).toBe("guest-1234567890");
    expect(resolveGuestSessionValue(issued.token)).toBe("guest-1234567890");
  });

  it("rejects a tampered token", () => {
    const issued = issueGuestSession("guest-1234567890");
    const tampered = `${issued.token.slice(0, -1)}x`;
    expect(verifyGuestSession(tampered)).toBeNull();
  });

  it("does not allow changing the guest identity without resigning the token", () => {
    const issued = issueGuestSession("guest-1234567890");
    const [, payload, signature] = issued.token.split(".");
    const forgedPayload = Buffer.from(
      JSON.stringify({ guestId: "guest-attacker-1234", issuedAt: 1, expiresAt: 4_102_444_800 }),
      "utf8",
    ).toString("base64url");

    expect(verifyGuestSession(`g1.${forgedPayload}.${signature}`)).toBeNull();
    expect(verifyGuestSession(`g1.${payload}.${signature}`)).toBe("guest-1234567890");
  });

  it("keeps raw guest IDs only for non-production migration compatibility", () => {
    process.env.NODE_ENV = "production";
    expect(() => resolveGuestSessionValue("legacy-guest-id")).toThrow(/invalid|expired/i);
  });
});
