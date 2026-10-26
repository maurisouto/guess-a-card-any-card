import { FragmentPuzzleDifficulty, FragmentPuzzleMode } from "@/generated/prisma/client";
import { describe, expect, it } from "vitest";
import {
  buildDifficultyBreakdownFromGroups,
  buildModeBreakdownFromGroups,
  buildSetProgress,
  pickRarestRestoredCard,
  rarityRestorationRank,
} from "@/server/services/fragments-profile-aggregate";

describe("fragments-profile-aggregate", () => {
  it("buildSetProgress uses catalog totals and distinct restored printings", () => {
    const catalog = new Map<string, number>([
      ["Monarch", 307],
      ["Dynasty", 100],
    ]);
    const pairs = [
      { fabSet: "Monarch", cardId: "a" },
      { fabSet: "Monarch", cardId: "b" },
      { fabSet: "Monarch", cardId: "a" },
    ];
    const rows = buildSetProgress(pairs, catalog, ["Dynasty", "Monarch"]);
    const monarch = rows.find((r) => r.setName === "Monarch")!;
    expect(monarch.restoredUniqueCount).toBe(2);
    expect(monarch.availableInCatalog).toBe(307);
    expect(monarch.percentRestored).toBeCloseTo(0.7, 0);
    const dynasty = rows.find((r) => r.setName === "Dynasty")!;
    expect(dynasty.restoredUniqueCount).toBe(0);
    expect(dynasty.percentRestored).toBe(0);
  });

  it("buildSetProgress skips null or empty fabSet", () => {
    const rows = buildSetProgress(
      [{ fabSet: null, cardId: "x" }, { fabSet: "  ", cardId: "y" }],
      new Map([["Monarch", 1]]),
      ["Monarch"],
    );
    expect(rows[0]?.restoredUniqueCount).toBe(0);
  });

  it("mode breakdown maps prisma groups to wire buckets", () => {
    const b = buildModeBreakdownFromGroups([
      {
        puzzleMode: FragmentPuzzleMode.FRAGMENTS,
        _count: { _all: 10 },
        _avg: { timeMs: 1000, moves: 12 },
      },
      {
        puzzleMode: FragmentPuzzleMode.SLIDING,
        _count: { _all: 2 },
        _avg: { timeMs: 2000, moves: 30 },
      },
    ]);
    expect(b.fragments.completions).toBe(10);
    expect(b.fragments.averageTimeMs).toBe("1000.00");
    expect(b.sliding.averageMoves).toBe("30.00");
  });

  it("difficulty breakdown fills easy/normal/hard", () => {
    const b = buildDifficultyBreakdownFromGroups([
      {
        difficulty: FragmentPuzzleDifficulty.EASY,
        _count: { _all: 1 },
        _avg: { timeMs: 500, moves: 4 },
      },
      {
        difficulty: FragmentPuzzleDifficulty.NORMAL,
        _count: { _all: 3 },
        _avg: { timeMs: null, moves: null },
      },
    ]);
    expect(b.easy.completions).toBe(1);
    expect(b.normal.completions).toBe(3);
    expect(b.normal.averageTimeMs).toBeNull();
    expect(b.hard.completions).toBe(0);
  });

  it("pickRarestRestoredCard chooses highest tier among unique cards", () => {
    const winner = pickRarestRestoredCard([
      { cardId: "a", cardName: "A", cardImageUrl: "", fabSet: null, rarity: "Common" },
      { cardId: "b", cardName: "B", cardImageUrl: "", fabSet: null, rarity: "Majestic" },
      { cardId: "b", cardName: "B", cardImageUrl: "", fabSet: null, rarity: "Common" },
    ]);
    expect(winner?.cardId).toBe("b");
    expect(winner?.rarity).toBe("Majestic");
  });

  it("rarityRestorationRank orders Marvel above Legendary", () => {
    expect(rarityRestorationRank("Marvel")).toBeGreaterThan(rarityRestorationRank("Legendary"));
  });
});
