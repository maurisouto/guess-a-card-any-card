import { beforeEach, describe, expect, it, vi } from "vitest";

const queryRaw = vi.hoisted(() => vi.fn());
const catalogReady = vi.hoisted(() => vi.fn());

vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: queryRaw } }));
vi.mock("@/server/services/card-catalog-service", () => ({
  isCardCatalogReady: catalogReady,
}));

import {
  __resetApplicationLifecycleForTests,
  markApplicationReady,
} from "@/server/app-lifecycle";
import { __resetReadinessForTests, isApplicationReady } from "@/server/readiness";

describe("application readiness", () => {
  beforeEach(() => {
    __resetApplicationLifecycleForTests();
    __resetReadinessForTests();
    queryRaw.mockReset();
    catalogReady.mockReset();
    catalogReady.mockReturnValue(true);
    queryRaw.mockResolvedValue([{ ok: 1 }]);
  });

  it("requires lifecycle startup and catalog completion", async () => {
    await expect(isApplicationReady()).resolves.toBe(false);
    expect(queryRaw).not.toHaveBeenCalled();

    markApplicationReady();
    catalogReady.mockReturnValue(false);
    await expect(isApplicationReady()).resolves.toBe(false);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it("checks PostgreSQL once for concurrent readiness requests", async () => {
    markApplicationReady();
    const pending = defer<unknown[]>();
    queryRaw.mockReturnValue(pending.promise);

    const first = isApplicationReady();
    const second = isApplicationReady();
    expect(queryRaw).toHaveBeenCalledTimes(1);
    pending.resolve([{ ok: 1 }]);

    await expect(Promise.all([first, second])).resolves.toEqual([true, true]);
  });

  it("returns false when PostgreSQL is unavailable", async () => {
    markApplicationReady();
    queryRaw.mockRejectedValue(new Error("database unavailable"));
    await expect(isApplicationReady()).resolves.toBe(false);
  });
});

function defer<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}
