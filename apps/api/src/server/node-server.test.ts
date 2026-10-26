import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";

const disconnect = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({ prisma: { $disconnect: disconnect } }));
vi.mock("@/server/http-app", () => ({ app: { fetch: vi.fn() } }));
vi.mock("@/server/realtime/coop-realtime", () => ({
  attachCoopRealtime: vi.fn(),
}));

import { __resetApplicationLifecycleForTests } from "@/server/app-lifecycle";
import { closeApiNodeServer, type ApiNodeServer } from "@/server/node-server";

describe("closeApiNodeServer", () => {
  beforeEach(() => {
    __resetApplicationLifecycleForTests();
    disconnect.mockReset().mockResolvedValue(undefined);
  });

  it("closes realtime before HTTP and disconnects Prisma after the drain", async () => {
    const events: string[] = [];
    const api = fakeApi({
      close: (callback?: (error?: Error) => void) => {
        events.push("http-close");
        callback?.();
      },
    });
    api.realtime.close = () => events.push("realtime-close");
    disconnect.mockImplementation(() => {
      events.push("prisma-disconnect");
      return Promise.resolve();
    });

    await closeApiNodeServer(api);

    expect(events).toEqual(["realtime-close", "http-close", "prisma-disconnect"]);
  });

  it("bounds shutdown and terminates remaining HTTP connections", async () => {
    const closeAllConnections = vi.fn();
    const api = fakeApi({ close: () => {}, closeAllConnections });

    await expect(closeApiNodeServer(api, 5)).rejects.toThrow("shutdown timed out");
    expect(closeAllConnections).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});

function fakeApi(serverOverrides: {
  close?: (callback?: (error?: Error) => void) => void;
  closeAllConnections?: () => void;
} = {}): ApiNodeServer {
  return {
    server: {
      close: ((callback?: (error?: Error) => void) => callback?.()) as unknown as Server["close"],
      closeAllConnections: vi.fn(),
      ...serverOverrides,
    } as unknown as Server,
    realtime: {
      close: vi.fn(),
      broadcastRoom: vi.fn(),
      handleUpgrade: vi.fn(),
    } as ApiNodeServer["realtime"],
  };
}
