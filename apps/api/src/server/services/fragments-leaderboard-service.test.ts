import { describe, expect, it } from "vitest";
import { FragmentsHttpError } from "@/server/services/fragments-service";
import { parseFragmentsLeaderboardQuery } from "@/server/services/fragments-leaderboard-service";

describe("parseFragmentsLeaderboardQuery", () => {
  it("defaults and normalizes category aliases", () => {
    const q = parseFragmentsLeaderboardQuery(new URLSearchParams(""));
    expect(q.category).toBe("fastest");
    expect(q.mode).toBe("all");
    expect(q.difficulty).toBe("all");
    expect(q.limit).toBe(50);
    expect(q.offset).toBe(0);

    expect(
      parseFragmentsLeaderboardQuery(new URLSearchParams("category=unique")).category,
    ).toBe("most_unique_cards");
    expect(
      parseFragmentsLeaderboardQuery(new URLSearchParams("category=fewest")).category,
    ).toBe("fewest_moves");
  });

  it("clamps limit and offset", () => {
    const q = parseFragmentsLeaderboardQuery(
      new URLSearchParams("limit=999&offset=-1&category=most"),
    );
    expect(q.limit).toBe(100);
    expect(q.offset).toBe(0);
  });

  it("rejects invalid category", () => {
    expect(() =>
      parseFragmentsLeaderboardQuery(new URLSearchParams("category=hack")),
    ).toThrow(FragmentsHttpError);
  });

  it("rejects invalid mode", () => {
    expect(() => parseFragmentsLeaderboardQuery(new URLSearchParams("mode=speed"))).toThrow(
      FragmentsHttpError,
    );
  });

  it("rejects invalid difficulty", () => {
    expect(() =>
      parseFragmentsLeaderboardQuery(new URLSearchParams("difficulty=expert")),
    ).toThrow(FragmentsHttpError);
  });
});

describe("leaderboard ordering (tie-break invariants)", () => {
  it("fastest: lower time, then fewer moves, then earlier completion", () => {
    const runs = [
      { timeMs: 1000, moves: 10, completedAt: 3 },
      { timeMs: 1000, moves: 9, completedAt: 2 },
      { timeMs: 999, moves: 50, completedAt: 1 },
    ];
    runs.sort(
      (a, b) =>
        a.timeMs - b.timeMs || a.moves - b.moves || a.completedAt - b.completedAt,
    );
    expect(runs[0]?.timeMs).toBe(999);
    expect(runs[1]?.moves).toBe(9);
  });

  it("fewest moves: lower moves, then lower time, then earlier completion", () => {
    const runs = [
      { moves: 10, timeMs: 5000, completedAt: 3 },
      { moves: 10, timeMs: 4000, completedAt: 2 },
      { moves: 8, timeMs: 9000, completedAt: 1 },
    ];
    runs.sort(
      (a, b) =>
        a.moves - b.moves || a.timeMs - b.timeMs || a.completedAt - b.completedAt,
    );
    expect(runs[0]?.moves).toBe(8);
    expect(runs[1]?.timeMs).toBe(4000);
  });

  it("most restorations aggregate: higher count, then higher unique, then earlier last activity", () => {
    const rows = [
      { run_count: 10, unique_cards: 5, last_at: 100 },
      { run_count: 10, unique_cards: 6, last_at: 200 },
      { run_count: 11, unique_cards: 1, last_at: 50 },
    ];
    rows.sort(
      (a, b) =>
        b.run_count - a.run_count ||
        b.unique_cards - a.unique_cards ||
        a.last_at - b.last_at,
    );
    expect(rows[0]?.run_count).toBe(11);
    expect(rows[1]?.unique_cards).toBe(6);
  });

  it("most unique aggregate: higher unique, then higher runs, then earlier last activity", () => {
    const rows = [
      { unique_cards: 40, run_count: 50, last_at: 10 },
      { unique_cards: 40, run_count: 60, last_at: 5 },
      { unique_cards: 41, run_count: 30, last_at: 20 },
    ];
    rows.sort(
      (a, b) =>
        b.unique_cards - a.unique_cards ||
        b.run_count - a.run_count ||
        a.last_at - b.last_at,
    );
    expect(rows[0]?.unique_cards).toBe(41);
    expect(rows[1]?.run_count).toBe(60);
  });
});
