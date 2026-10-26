import { Hono } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getFragmentsLeaderboard = vi.hoisted(() => vi.fn());

vi.mock("@/server/services/fragments-leaderboard-service", () => ({
  getFragmentsLeaderboard,
}));

import { fragmentsRoutes } from "@/server/fragments-routes";

describe("fragments leaderboards HTTP", () => {
  beforeEach(() => {
    getFragmentsLeaderboard.mockReset();
  });

  it("GET /api/fragments/leaderboards returns payload", async () => {
    getFragmentsLeaderboard.mockResolvedValue({
      category: "fastest",
      mode: "all",
      difficulty: "all",
      limit: 50,
      offset: 0,
      hasMore: false,
      entries: [
        {
          rank: 1,
          userId: "11111111-1111-4111-8111-111111111111",
          username: "Archivist",
          avatarUrl: null,
          value: 1200,
          timeMs: 1200,
          moves: 10,
          cardName: "Test",
          fabSet: "Monarch",
          rarity: "Rare",
          completedAt: "2026-05-09T12:00:00.000Z",
        },
      ],
    });

    const app = new Hono().basePath("/api").route("/fragments", fragmentsRoutes);
    const res = await app.request(
      "http://localhost/api/fragments/leaderboards?category=fastest&mode=all&difficulty=all",
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { entries: unknown[]; category: string };
    expect(body.category).toBe("fastest");
    expect(body.entries).toHaveLength(1);
    expect(getFragmentsLeaderboard).toHaveBeenCalled();
  });
});
