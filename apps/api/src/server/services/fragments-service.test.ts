import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = {
  fragmentsCompletion: {
    findUnique: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
  },
  userFragmentsStat: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  userFragmentsCardStat: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

const prismaMock = {
  $transaction: vi.fn(async (fn: (inner: typeof tx) => Promise<unknown>) => fn(tx)),
  $queryRaw: vi.fn(),
  fragmentsCompletion: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    groupBy: vi.fn(),
    findFirst: vi.fn(),
  },
  userFragmentsStat: {
    findUnique: vi.fn(),
  },
  userFragmentsCardStat: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

describe("fragments-service", () => {
  beforeEach(() => {
    for (const fn of [
      tx.fragmentsCompletion.findUnique,
      tx.fragmentsCompletion.create,
      tx.userFragmentsStat.findUnique,
      tx.userFragmentsStat.create,
      tx.userFragmentsStat.update,
      tx.userFragmentsCardStat.findUnique,
      tx.userFragmentsCardStat.create,
      tx.userFragmentsCardStat.update,
      tx.fragmentsCompletion.findMany,
      tx.userFragmentsCardStat.findMany,
      tx.user.findUnique,
      prismaMock.$transaction,
      prismaMock.fragmentsCompletion.findUnique,
      prismaMock.fragmentsCompletion.findMany,
      prismaMock.fragmentsCompletion.groupBy,
      prismaMock.fragmentsCompletion.findFirst,
      prismaMock.userFragmentsStat.findUnique,
      prismaMock.userFragmentsCardStat.findMany,
      prismaMock.userFragmentsCardStat.findFirst,
      prismaMock.user.findUnique,
      prismaMock.$queryRaw,
    ]) {
      fn.mockReset();
    }
    prismaMock.$transaction.mockImplementation(async (fn: (inner: typeof tx) => Promise<unknown>) => fn(tx));
  });

  it("guest completion returns persisted false and does not write", async () => {
    const { recordFragmentsCompletion } = await import("@/server/services/fragments-service");
    const result = await recordFragmentsCompletion(
      { kind: "guest", guestId: "guest-1" },
      {
        runId: "run-1",
        cardId: "card-1",
        cardName: "Card",
        cardImageUrl: "https://img",
        fabSet: "Welcome to Rathe",
        rarity: "Common",
        puzzleMode: "fragments",
        difficulty: "easy",
        timeMs: 1000,
        moves: 10,
        seed: "seed-a",
        templateId: null,
      },
    );
    expect(result.persisted).toBe(false);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("registered completion creates completion and updates aggregate stats", async () => {
    tx.fragmentsCompletion.findUnique.mockResolvedValue(null);
    tx.userFragmentsStat.findUnique.mockResolvedValue(null);
    tx.userFragmentsCardStat.findUnique.mockResolvedValue(null);

    const { recordFragmentsCompletion } = await import("@/server/services/fragments-service");
    const result = await recordFragmentsCompletion(
      { kind: "user", userId: "11111111-1111-4111-8111-111111111111" },
      {
        runId: "run-2",
        cardId: "card-2",
        cardName: "Bravo Card",
        cardImageUrl: "https://img/c2.png",
        fabSet: "Monarch",
        rarity: "Majestic",
        puzzleMode: "sliding",
        difficulty: "hard",
        timeMs: 24000,
        moves: 88,
        seed: "seed-b",
        templateId: null,
      },
    );

    expect(result.persisted).toBe(true);
    expect(tx.fragmentsCompletion.create).toHaveBeenCalledTimes(1);
    expect(tx.userFragmentsStat.create).toHaveBeenCalledTimes(1);
    expect(tx.userFragmentsCardStat.create).toHaveBeenCalledTimes(1);
  });

  it("updates per-card and user aggregate rows on subsequent run", async () => {
    tx.fragmentsCompletion.findUnique.mockResolvedValue(null);
    tx.userFragmentsStat.findUnique.mockResolvedValue({
      userId: "111",
      puzzlesCompleted: 2,
      totalTimeMs: BigInt(3000),
      totalMoves: BigInt(30),
      bestTimeMs: 1200,
      bestMoves: 12,
      fragmentsCount: 2,
      slidingCount: 0,
      easyCount: 1,
      normalCount: 1,
      hardCount: 0,
    });
    tx.userFragmentsCardStat.findUnique.mockResolvedValue({
      userId: "111",
      cardId: "card-3",
      cardName: "Card 3",
      timesCompleted: 2,
      totalTimeMs: BigInt(5000),
      totalMoves: BigInt(40),
      bestTimeMs: 1800,
      bestMoves: 15,
    });

    const { recordFragmentsCompletion } = await import("@/server/services/fragments-service");
    await recordFragmentsCompletion(
      { kind: "user", userId: "11111111-1111-4111-8111-111111111111" },
      {
        runId: "run-3",
        cardId: "card-3",
        cardName: "Card 3",
        cardImageUrl: "https://img/c3.png",
        fabSet: "Dynasty",
        rarity: "Rare",
        puzzleMode: "fragments",
        difficulty: "normal",
        timeMs: 1500,
        moves: 9,
        seed: "seed-c",
        templateId: "wedge-4x5",
      },
    );

    expect(tx.userFragmentsStat.update).toHaveBeenCalledTimes(1);
    expect(tx.userFragmentsCardStat.update).toHaveBeenCalledTimes(1);
    expect(tx.userFragmentsCardStat.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          timesCompleted: 3,
          bestTimeMs: 1500,
          bestMoves: 9,
        }),
      }),
    );
  });

  it("duplicate runId does not double-count", async () => {
    tx.fragmentsCompletion.findUnique.mockResolvedValue({
      userId: "11111111-1111-4111-8111-111111111111",
    });
    const { recordFragmentsCompletion } = await import("@/server/services/fragments-service");
    const result = await recordFragmentsCompletion(
      { kind: "user", userId: "11111111-1111-4111-8111-111111111111" },
      {
        runId: "run-dup",
        cardId: "card-4",
        cardName: "Card 4",
        cardImageUrl: "https://img/c4.png",
        fabSet: null,
        rarity: null,
        puzzleMode: "fragments",
        difficulty: "easy",
        timeMs: 500,
        moves: 4,
        seed: "seed-d",
        templateId: "t1",
      },
    );
    expect(result.persisted).toBe(true);
    expect(tx.fragmentsCompletion.create).not.toHaveBeenCalled();
    expect(tx.userFragmentsStat.update).not.toHaveBeenCalled();
  });

  it("rejects invalid mode/difficulty in input parser", async () => {
    const { parseFragmentsCompletionInput } = await import("@/server/services/fragments-service");
    expect(() =>
      parseFragmentsCompletionInput({
        runId: "x",
        cardId: "c",
        cardName: "n",
        cardImageUrl: "https://x",
        puzzleMode: "wrong",
        difficulty: "easy",
        timeMs: 1,
        moves: 1,
        seed: "s",
      }),
    ).toThrow(/puzzleMode/i);

    expect(() =>
      parseFragmentsCompletionInput({
        runId: "x",
        cardId: "c",
        cardName: "n",
        cardImageUrl: "https://x",
        puzzleMode: "fragments",
        difficulty: "wrong",
        timeMs: 1,
        moves: 1,
        seed: "s",
      }),
    ).toThrow(/difficulty/i);
  });

  it("profile query returns expected shape", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: "11111111-1111-4111-8111-111111111111" });
    prismaMock.userFragmentsStat.findUnique.mockResolvedValue({
      userId: "11111111-1111-4111-8111-111111111111",
      puzzlesCompleted: 5,
      totalTimeMs: BigInt(7500),
      totalMoves: BigInt(60),
      averageTimeMs: new (await import("@/generated/prisma/client")).Prisma.Decimal("1500.50"),
      averageMoves: new (await import("@/generated/prisma/client")).Prisma.Decimal("12.33"),
      bestTimeMs: 900,
      bestMoves: 7,
      lastCompletedAt: new Date("2026-05-09T00:00:00.000Z"),
      fragmentsCount: 4,
      slidingCount: 1,
      easyCount: 2,
      normalCount: 2,
      hardCount: 1,
    });
    const completionRow = {
      runId: "r1",
      cardId: "c1",
      cardName: "Card 1",
      cardImageUrl: "https://img/1",
      fabSet: "Monarch",
      rarity: "Common",
      puzzleMode: "FRAGMENTS",
      difficulty: "EASY",
      timeMs: 1100,
      moves: 8,
      seed: "s1",
      templateId: "t1",
      completedAt: new Date("2026-05-09T00:00:00.000Z"),
    };
    prismaMock.fragmentsCompletion.findMany
      .mockResolvedValueOnce([completionRow])
      .mockResolvedValueOnce([]);
    prismaMock.userFragmentsCardStat.findMany.mockResolvedValue([]);
    prismaMock.fragmentsCompletion.groupBy.mockImplementation(
      async (args: { by: string[]; where?: { userId?: string } }) => {
        if (args.by[0] === "puzzleMode") {
          return [
            {
              puzzleMode: "FRAGMENTS",
              _count: { _all: 4 },
              _avg: { timeMs: 1200, moves: 10 },
            },
            {
              puzzleMode: "SLIDING",
              _count: { _all: 1 },
              _avg: { timeMs: 2000, moves: 20 },
            },
          ];
        }
        if (args.by[0] === "difficulty") {
          return [
            { difficulty: "EASY", _count: { _all: 2 }, _avg: { timeMs: 1000, moves: 8 } },
            { difficulty: "NORMAL", _count: { _all: 2 }, _avg: { timeMs: 1500, moves: 12 } },
            { difficulty: "HARD", _count: { _all: 1 }, _avg: { timeMs: 2200, moves: 18 } },
          ];
        }
        if (args.by.length === 1 && args.by[0] === "cardId") {
          return [{ cardId: "c1" }, { cardId: "c2" }];
        }
        if (args.by[0] === "fabSet") {
          return [
            { fabSet: "Monarch", cardId: "c1" },
            { fabSet: "Monarch", cardId: "c2" },
          ];
        }
        return [];
      },
    );
    prismaMock.fragmentsCompletion.findFirst
      .mockResolvedValueOnce(completionRow)
      .mockResolvedValueOnce({ ...completionRow, moves: 5, timeMs: 2000 });
    prismaMock.userFragmentsCardStat.findFirst.mockResolvedValue({
      userId: "11111111-1111-4111-8111-111111111111",
      cardId: "c1",
      cardName: "Card 1",
      timesCompleted: 3,
      totalTimeMs: BigInt(3300),
      totalMoves: BigInt(24),
      bestTimeMs: 900,
      bestMoves: 7,
      averageTimeMs: new (await import("@/generated/prisma/client")).Prisma.Decimal("1100"),
      averageMoves: new (await import("@/generated/prisma/client")).Prisma.Decimal("8"),
      lastCompletedAt: new Date("2026-05-09T00:00:00.000Z"),
    });
    prismaMock.$queryRaw.mockResolvedValue([
      { cardId: "c1", cardName: "Card 1", cardImageUrl: "https://img/1", fabSet: "Monarch", rarity: "Common" },
      { cardId: "c2", cardName: "Card 2", cardImageUrl: "https://img/2", fabSet: "Monarch", rarity: "Rare" },
    ]);

    const { getFragmentsProfileByUserId } = await import("@/server/services/fragments-service");
    const profile = await getFragmentsProfileByUserId("11111111-1111-4111-8111-111111111111");
    expect(profile).not.toBeNull();
    expect(profile?.summary.puzzlesCompleted).toBe(5);
    expect(profile?.summary.uniqueCardsRestored).toBe(2);
    expect(profile?.summary.totalRestorationTimeMs).toBe("7500");
    expect(profile?.recentCompletions[0]?.puzzleMode).toBe("fragments");
    expect(Array.isArray(profile?.bestRuns)).toBe(true);
    expect(profile?.highlights.fastestRestoration?.runId).toBe("r1");
    expect(profile?.highlights.mostRestoredCard?.timesCompleted).toBe(3);
    expect(profile?.highlights.rarestRestoredCard?.rarity).toBe("Rare");
    expect(profile?.modeBreakdown.fragments.completions).toBe(4);
    expect(profile?.difficultyBreakdown.hard.completions).toBe(1);
    expect(Array.isArray(profile?.setProgress)).toBe(true);
  });
});
