import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveActorFromRequest = vi.hoisted(() => vi.fn());
const requireUserActor = vi.hoisted(() => vi.fn());
const parseFragmentsCompletionInput = vi.hoisted(() => vi.fn());
const recordFragmentsCompletion = vi.hoisted(() => vi.fn());
const getFragmentsProfileByUserId = vi.hoisted(() => vi.fn());

vi.mock("@/server/auth/resolve-actor", () => ({
  resolveActorFromRequest,
  requireUserActor,
}));

vi.mock("@/server/services/fragments-service", () => ({
  parseFragmentsCompletionInput,
  recordFragmentsCompletion,
  getFragmentsProfileByUserId,
  FragmentsHttpError: class FragmentsHttpError extends Error {
    status: number;
    constructor(status: number, msg: string) {
      super(msg);
      this.status = status;
    }
  },
}));

import { fragmentsRoutes } from "@/server/fragments-routes";

describe("fragments HTTP routes", () => {
  beforeEach(() => {
    resolveActorFromRequest.mockReset();
    requireUserActor.mockReset();
    parseFragmentsCompletionInput.mockReset();
    recordFragmentsCompletion.mockReset();
    getFragmentsProfileByUserId.mockReset();
  });

  it("POST /api/fragments/completions returns persisted payload", async () => {
    resolveActorFromRequest.mockResolvedValue({ kind: "guest", guestId: "g-1" });
    parseFragmentsCompletionInput.mockReturnValue({ runId: "r1" });
    recordFragmentsCompletion.mockResolvedValue({ persisted: false });

    const app = new Hono().basePath("/api").route("/fragments", fragmentsRoutes);
    const res = await app.request("http://localhost/api/fragments/completions", {
      method: "POST",
      body: JSON.stringify({ runId: "r1" }),
      headers: { "content-type": "application/json" },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ persisted: false });
  });

  it("GET /api/fragments/profile/me uses requireUserActor", async () => {
    requireUserActor.mockResolvedValue({
      kind: "user",
      userId: "11111111-1111-4111-8111-111111111111",
    });
    getFragmentsProfileByUserId.mockResolvedValue({
      userId: "11111111-1111-4111-8111-111111111111",
      summary: {
        puzzlesCompleted: 0,
        uniqueCardsRestored: 0,
        averageTimeMs: null,
        averageMoves: null,
        bestTimeMs: null,
        bestMoves: null,
        lastCompletedAt: null,
        totalRestorationTimeMs: null,
        lastRestoredCardName: null,
        lastRestoredCardId: null,
        lastRestoredSet: null,
        fragmentsCount: 0,
        slidingCount: 0,
        easyCount: 0,
        normalCount: 0,
        hardCount: 0,
      },
      recentCompletions: [],
      bestRuns: [],
      cardHighlights: [],
      highlights: {
        fastestRestoration: null,
        lowestMoveRestoration: null,
        mostRestoredCard: null,
        rarestRestoredCard: null,
        latestRestoration: null,
      },
      setProgress: [],
      modeBreakdown: {
        fragments: { completions: 0, averageTimeMs: null, averageMoves: null },
        sliding: { completions: 0, averageTimeMs: null, averageMoves: null },
      },
      difficultyBreakdown: {
        easy: { completions: 0, averageTimeMs: null, averageMoves: null },
        normal: { completions: 0, averageTimeMs: null, averageMoves: null },
        hard: { completions: 0, averageTimeMs: null, averageMoves: null },
      },
    });

    const app = new Hono().basePath("/api").route("/fragments", fragmentsRoutes);
    const res = await app.request("http://localhost/api/fragments/profile/me");
    expect(res.status).toBe(200);
    expect(requireUserActor).toHaveBeenCalled();
    const body = (await res.json()) as { summary: { puzzlesCompleted: number } };
    expect(body.summary.puzzlesCompleted).toBe(0);
  });
});
