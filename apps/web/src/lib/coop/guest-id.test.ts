import { afterEach, describe, expect, it, vi } from "vitest";

type LocalStorageMock = Storage & { values: Map<string, string> };

function createLocalStorage(initial: Record<string, string> = {}): LocalStorageMock {
  const values = new Map(Object.entries(initial));
  return {
    values,
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  } as LocalStorageMock;
}

function response(status: number, body: Record<string, unknown> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function loadGuestIdModule(storage: LocalStorageMock) {
  vi.resetModules();
  vi.stubGlobal("window", { localStorage: storage });
  return import("@/lib/coop/guest-id");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("guest session initialization", () => {
  it("validates a valid persisted guest session without retrying", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      response(201, { guestId: "existing-guest-id", token: "refreshed-token" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { getOrCreateGuestToken } = await loadGuestIdModule(
      createLocalStorage({ "gac-guest-token": "signed-token" }),
    );

    await expect(getOrCreateGuestToken()).resolves.toBe("refreshed-token");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]).toEqual([
      "/api/guest/session",
      { method: "POST", headers: { "x-guest-id": "signed-token" } },
    ]);
  });

  it("creates a guest session normally when no credentials exist", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      response(201, { guestId: "server-guest-id", token: "new-token" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const storage = createLocalStorage();
    const { getOrCreateGuestToken } = await loadGuestIdModule(storage);

    await expect(getOrCreateGuestToken()).resolves.toBe("new-token");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]).toEqual(["/api/guest/session", { method: "POST" }]);
    expect(storage.getItem("gac-guest-token")).toBe("new-token");
    expect(storage.getItem("gac-guest-id")).toBe("server-guest-id");
  });

  it("clears stale credentials and retries once without the old guest header", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(401, { error: "expired" }))
      .mockResolvedValueOnce(
        response(201, { guestId: "recovered-guest-id", token: "recovered-token" }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const storage = createLocalStorage({
      "gac-guest-id": "legacy-guest-id",
      "gac-guest-token": "stale-token",
    });
    const { getOrCreateGuestToken } = await loadGuestIdModule(storage);

    await expect(getOrCreateGuestToken()).resolves.toBe("recovered-token");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]).toEqual(["/api/guest/session", { method: "POST" }]);
    expect(storage.getItem("gac-guest-token")).toBe("recovered-token");
    expect(storage.getItem("gac-guest-id")).toBe("recovered-guest-id");
  });

  it("stops after two 401 responses and does not reinitialize on later calls", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(response(401));
    vi.stubGlobal("fetch", fetchMock);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { getOrCreateGuestToken } = await loadGuestIdModule(
      createLocalStorage({ "gac-guest-id": "stale-guest-id" }),
    );

    await expect(getOrCreateGuestToken()).rejects.toThrow("Could not establish guest session.");
    await expect(getOrCreateGuestToken()).rejects.toThrow("Could not establish guest session.");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(error).toHaveBeenCalledWith(
      "[gac] Guest session initialization failed during recovery request: HTTP 401.",
    );
  });

  it("stops after a failed recovery response without retrying again", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(401))
      .mockResolvedValueOnce(response(500));
    vi.stubGlobal("fetch", fetchMock);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { getOrCreateGuestToken } = await loadGuestIdModule(
      createLocalStorage({ "gac-guest-id": "stale-guest-id" }),
    );

    await expect(getOrCreateGuestToken()).rejects.toThrow("Could not establish guest session.");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(error).toHaveBeenCalledWith(
      "[gac] Guest session initialization failed during recovery request: HTTP 500.",
    );
  });

  it("does not retry a non-401 HTTP error", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(response(500));
    vi.stubGlobal("fetch", fetchMock);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { getOrCreateGuestToken } = await loadGuestIdModule(createLocalStorage());

    await expect(getOrCreateGuestToken()).rejects.toThrow("Could not establish guest session.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(
      "[gac] Guest session initialization failed during initial request: HTTP 500.",
    );
  });

  it("does not retry network failures", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch"));
    vi.stubGlobal("fetch", fetchMock);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { getOrCreateGuestToken } = await loadGuestIdModule(createLocalStorage());

    await expect(getOrCreateGuestToken()).rejects.toThrow("Failed to fetch");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(
      "[gac] Guest session initialization failed during request: network error (no HTTP status).",
    );
  });

  it("deduplicates concurrent initialization calls", async () => {
    let resolveResponse!: (value: Response) => void;
    const fetchMock = vi.fn().mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { getOrCreateGuestToken } = await loadGuestIdModule(createLocalStorage());

    const first = getOrCreateGuestToken();
    const second = getOrCreateGuestToken();
    resolveResponse(response(201, { token: "shared-token" }));

    await expect(Promise.all([first, second])).resolves.toEqual([
      "shared-token",
      "shared-token",
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
