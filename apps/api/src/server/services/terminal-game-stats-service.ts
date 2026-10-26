import type { Prisma } from "@/generated/prisma/client";
import { GameMode, GameStatus } from "@/generated/prisma/client";
import {
  applyGameOutcomeToUserStatsInTx,
  mergeUserCardStatsAfterGameInTx,
} from "@/server/repositories/stats-repository";

function isTerminalStatus(status: GameStatus): boolean {
  return (
    status === GameStatus.WON ||
    status === GameStatus.LOST ||
    status === GameStatus.CANCELLED
  );
}

const STATS_PIPELINE_MODES: ReadonlySet<GameMode> = new Set([
  GameMode.SINGLE,
  GameMode.CHALLENGE,
  GameMode.COOP,
  GameMode.COMPETITIVE,
]);

/**
 * Applies persistent stats for every {@link GamePlayer} with a `userId` once the game is terminal.
 * **Guests are skipped.** Idempotent via `Game.statsAggregatedAt`; PostgreSQL row locks
 * serialize concurrent attempts for the same game and aggregate rows.
 *
 * **Outcome mapping (all modes):** uses `GamePlayer.didWin` plus per-player guess counts and times;
 * `WON`/`LOST`/`CANCELLED` games are terminal; co-op **shared win** gives every seated player the same
 * win; competitive uses per-player `didWin` (can be multiple solvers; ties are gameplay-defined).
 */
export async function applyRegisteredUserStatsForTerminalGameInTx(
  tx: Prisma.TransactionClient,
  gameId: string,
): Promise<void> {
  // Serialize all terminal aggregation attempts for this game. The lock and the
  // aggregate writes live in the caller's transaction, so a rollback releases
  // the claim without leaving statsAggregatedAt behind.
  await tx.$queryRaw`SELECT id FROM games WHERE id = ${gameId} FOR UPDATE`;

  const game = await tx.game.findUnique({
    where: { id: gameId },
    include: {
      gamePlayers: true,
      guesses: true,
    },
  });

  if (!game) {
    return;
  }
  if (!isTerminalStatus(game.status)) {
    return;
  }
  if (game.statsAggregatedAt != null) {
    return;
  }
  if (!STATS_PIPELINE_MODES.has(game.mode)) {
    return;
  }

  const finishedAt = game.finishedAt ?? new Date();

  const registeredPlayers = game.gamePlayers
    .filter((player) => player.userId)
    .sort((a, b) => (a.userId ?? "").localeCompare(b.userId ?? ""));

  for (const player of registeredPlayers) {
    const userId = player.userId;
    if (!userId) continue;

    const guesses = game.guesses.filter((g) => g.gamePlayerId === player.id);
    const attempts = guesses.length;
    const durationMs = guesses.reduce((s, g) => s + g.timeTakenMs, 0);
    const won = player.didWin;

    await applyGameOutcomeToUserStatsInTx(tx, {
      userId,
      won,
      attemptsToWin: won ? attempts : undefined,
      timeToWinMs: won ? durationMs : undefined,
      lastPlayedAt: finishedAt,
    });

    await mergeUserCardStatsAfterGameInTx(tx, {
      userId,
      cardId: game.cardId,
      won,
      attempts,
      durationMs,
    });
  }

  await tx.game.update({
    where: { id: gameId },
    data: { statsAggregatedAt: finishedAt },
  });
}
