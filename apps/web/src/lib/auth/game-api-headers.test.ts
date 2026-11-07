import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getOrCreateGuestToken = vi.hoisted(() => vi.fn());
const getSupabaseBrowserClient = vi.hoisted(() => vi.fn());

vi.mock("@/lib/coop/guest-id", () => ({ getOrCreateGuestToken }));
vi.mock("@/lib/supabase/client", () => ({ getSupabaseBrowserClient }));

import {
  buildGameApiRequestHeaders,
  mergeActorAuthHeaders,
} from "@/lib/auth/game-api-headers";

beforeEach(() => {
  vi.stubGlobal("window", {});
  getOrCreateGuestToken.mockReset().mockResolvedValue("guest-token");
  getSupabaseBrowserClient.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("mergeActorAuthHeaders", () => {
  it("sets guest only when no token", () => {
    const h = new Headers();
    mergeActorAuthHeaders(h, "guest-abc", null);
    expect(h.get("x-guest-id")).toBe("guest-abc");
    expect(h.get("Authorization")).toBeNull();
  });

  it("sets Bearer when token present", () => {
    const h = new Headers();
    mergeActorAuthHeaders(h, "guest-abc", "jwt-here");
    expect(h.get("x-guest-id")).toBe("guest-abc");
    expect(h.get("Authorization")).toBe("Bearer jwt-here");
  });

  it("omits guest header when guest id empty", () => {
    const h = new Headers();
    mergeActorAuthHeaders(h, "", "tok");
    expect(h.get("x-guest-id")).toBeNull();
    expect(h.get("Authorization")).toBe("Bearer tok");
  });
});

describe("buildGameApiRequestHeaders", () => {
  it("does not initialize guest session when Supabase has a valid session", async () => {
    getSupabaseBrowserClient.mockReturnValue({
      auth: {
        getSession: async () => ({
          data: {
            session: {
              access_token: "user-token",
              expires_at: Math.floor(Date.now() / 1000) + 3_600,
            },
          },
        }),
      },
    });

    const headers = await buildGameApiRequestHeaders();

    expect(headers.get("Authorization")).toBe("Bearer user-token");
    expect(headers.get("x-guest-id")).toBeNull();
    expect(getOrCreateGuestToken).not.toHaveBeenCalled();
  });

  it("initializes guest session when there is no Supabase session", async () => {
    getSupabaseBrowserClient.mockReturnValue({
      auth: {
        getSession: async () => ({ data: { session: null } }),
      },
    });

    const headers = await buildGameApiRequestHeaders();

    expect(headers.get("x-guest-id")).toBe("guest-token");
    expect(headers.get("Authorization")).toBeNull();
    expect(getOrCreateGuestToken).toHaveBeenCalledTimes(1);
  });
});
