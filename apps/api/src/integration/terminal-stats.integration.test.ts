import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { GameMode, GameStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { applyRegisteredUserStatsForTerminalGameInTx } from "@/server/services/terminal-game-stats-service";

const createdGameIds: string[] = [];
const createdUserIds: string[] = [];

async function createUser() {
  const user = await prisma.user.create({
    data: {
      displayName: "Terminal stats fixture",
      email: `${randomUUID()}@integration.test`,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

async function createTerminalGame(args: {
  userId: string;
  cardId: string;
  won: boolean;
  mode?: GameMode;
}) {
  const game = await prisma.game.create({
    data: {
      mode: args.mode ?? GameMode.SINGLE,
      cardId: args.cardId,
      cardName: "Terminal stats fixture card",
      cardSet: "TEST",
      cardImageUrl: "https://example.test/card.png",
      revealSeed: randomUUID(),
      revealCardKind: "standard",
      cardTemplateKey: "standard",
      status: args.won ? GameStatus.WON : GameStatus.LOST,
      finishedAt: new Date("2026-01-01T00:00:00.000Z"),
      gamePlayers: {
        create: {
          userId: args.userId,
          displayName: "Registered fixture",
          didWin: args.won,
        },
      },
    },
  });
  createdGameIds.push(game.id);
  return game;
}

async function aggregate(gameId: string) {
  return prisma.$transaction((tx) =>
    applyRegisteredUserStatsForTerminalGameInTx(tx, gameId),
  );
}

describe.sequential("PostgreSQL terminal statistics aggregation", () => {
  afterAll(async () => {
    if (createdGameIds.length > 0) {
      await prisma.game.deleteMany({ where: { id: { in: createdGameIds } } });
    }
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await prisma.$disconnect();
  });

  it("applies a terminal game exactly once across three concurrent attempts", async () => {
    const user = await createUser();
    const game = await createTerminalGame({
      userId: user.id,
      cardId: `same-game-${randomUUID()}`,
      won: true,
    });

    await expect(Promise.all([aggregate(game.id), aggregate(game.id), aggregate(game.id)])).resolves.toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    await aggregate(game.id);

    const [stat, cardStat, storedGame] = await Promise.all([
      prisma.userStat.findUnique({ where: { userId: user.id } }),
      prisma.userCardStat.findUnique({
        where: { userId_cardId: { userId: user.id, cardId: game.cardId } },
      }),
      prisma.game.findUnique({ where: { id: game.id } }),
    ]);

    expect(stat).toMatchObject({ gamesPlayed: 1, gamesWon: 1, gamesLost: 0 });
    expect(cardStat).toMatchObject({ timesPlayed: 1, timesWon: 1 });
    expect(storedGame?.statsAggregatedAt).not.toBeNull();
  }, 15_000);

  it("preserves both aggregate updates when different games finish concurrently", async () => {
    const user = await createUser();
    const wonGame = await createTerminalGame({
      userId: user.id,
      cardId: `cross-game-win-${randomUUID()}`,
      won: true,
    });
    const lostGame = await createTerminalGame({
      userId: user.id,
      cardId: wonGame.cardId,
      won: false,
    });

    await expect(Promise.all([aggregate(wonGame.id), aggregate(lostGame.id)])).resolves.toEqual([
      undefined,
      undefined,
    ]);

    const [stat, cardStat] = await Promise.all([
      prisma.userStat.findUnique({ where: { userId: user.id } }),
      prisma.userCardStat.findUnique({
        where: { userId_cardId: { userId: user.id, cardId: wonGame.cardId } },
      }),
    ]);

    expect(stat).toMatchObject({ gamesPlayed: 2, gamesWon: 1, gamesLost: 1 });
    expect(cardStat).toMatchObject({ timesPlayed: 2, timesWon: 1 });
  }, 15_000);

  it("rolls back the claim and aggregates when the surrounding transaction fails", async () => {
    const user = await createUser();
    const game = await createTerminalGame({
      userId: user.id,
      cardId: `rollback-${randomUUID()}`,
      won: true,
    });

    await expect(
      prisma.$transaction(async (tx) => {
        await applyRegisteredUserStatsForTerminalGameInTx(tx, game.id);
        throw new Error("intentional post-aggregation failure");
      }),
    ).rejects.toThrow("intentional post-aggregation failure");

    const [storedGame, stat, cardStat] = await Promise.all([
      prisma.game.findUnique({ where: { id: game.id } }),
      prisma.userStat.findUnique({ where: { userId: user.id } }),
      prisma.userCardStat.findUnique({
        where: { userId_cardId: { userId: user.id, cardId: game.cardId } },
      }),
    ]);

    expect(storedGame?.statsAggregatedAt).toBeNull();
    expect(stat).toBeNull();
    expect(cardStat).toBeNull();

    await aggregate(game.id);
    await expect(
      prisma.userStat.findUnique({ where: { userId: user.id } }),
    ).resolves.toMatchObject({ gamesPlayed: 1, gamesWon: 1 });
  }, 15_000);

  it("keeps co-op and competitive terminal aggregation idempotent", async () => {
    const user = await createUser();
    const coopGame = await createTerminalGame({
      userId: user.id,
      cardId: `coop-terminal-${randomUUID()}`,
      won: true,
      mode: GameMode.COOP,
    });
    const competitiveGame = await createTerminalGame({
      userId: user.id,
      cardId: `competitive-terminal-${randomUUID()}`,
      won: false,
      mode: GameMode.COMPETITIVE,
    });

    await Promise.all([
      aggregate(coopGame.id),
      aggregate(coopGame.id),
      aggregate(competitiveGame.id),
      aggregate(competitiveGame.id),
    ]);

    await expect(
      prisma.userStat.findUnique({ where: { userId: user.id } }),
    ).resolves.toMatchObject({ gamesPlayed: 2, gamesWon: 1, gamesLost: 1 });
  }, 15_000);
});
