import { beforeEach, describe, expect, it, vi } from "vitest";

const isApplicationReady = vi.hoisted(() => vi.fn());

vi.mock("@/server/readiness", () => ({ isApplicationReady }));

import {
  __resetApplicationLifecycleForTests,
  markApplicationReady,
  markApplicationShuttingDown,
} from "@/server/app-lifecycle";
import { app } from "@/server/http-app";

describe("HTTP application lifecycle", () => {
  beforeEach(() => {
    __resetApplicationLifecycleForTests();
    isApplicationReady.mockReset().mockResolvedValue(true);
  });

  it("keeps liveness available but blocks readiness during shutdown", async () => {
    markApplicationReady();
    markApplicationShuttingDown();

    const health = await app.request("http://localhost/api/health");
    const readiness = await app.request("http://localhost/api/ready");

    expect(health.status).toBe(200);
    expect(readiness.status).toBe(503);
    expect(isApplicationReady).not.toHaveBeenCalled();
  });
});
