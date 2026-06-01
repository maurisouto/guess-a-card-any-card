import { FragmentPuzzleDifficulty, FragmentPuzzleMode, Prisma } from "@/generated/prisma/client";
import type { Actor } from "@/lib/actor";
import { prisma } from "@/lib/prisma";
import {
  buildDifficultyBreakdownFromGroups,
  buildModeBreakdownFromGroups,
  buildSetProgress,
  pickRarestRestoredCard,
  type FragmentsDifficultyBreakdown,
  type FragmentsModeBreakdown,
  type RarestCandidate,
  type SetProgressRow,
} from "@/server/services/fragments-profile-aggregate";
import { getAllSets, getPlayablePrintingCountBySet } from "@/server/services/card-catalog-service";
import { isValidProfileUserId } from "@/server/services/profile-service";

export type FragmentsCompletionInput = {
  runId: string;
  cardId: string;
  cardName: string;
  cardImageUrl: string;
  fabSet: string | null;
  rarity: string | null;
  puzzleMode: "fragments" | "sliding";
  difficulty: "easy" | "normal" | "hard";
  timeMs: number;
  moves: number;
  seed: string;
  templateId: string | null;
};

export type FragmentsSummary = {
  puzzlesCompleted: number;
  /** Distinct catalog printing ids restored at least once. */
  uniqueCardsRestored: number;
  averageTimeMs: string | null;
  averageMoves: string | null;
  bestTimeMs: number | null;
  bestMoves: number | null;
  lastCompletedAt: string | null;
  /** Sum of all completion durations (ms) as string — safe for large totals. */
  totalRestorationTimeMs: string | null;
  lastRestoredCardName: string | null;
  lastRestoredCardId: string | null;
  lastRestoredSet: string | null;
  fragmentsCount: number;
  slidingCount: number;
  easyCount: number;
  normalCount: number;
  hardCount: number;
};

export type FragmentsProfileCompletion = {
  runId: string;
  cardId: string;
  cardName: string;
  cardImageUrl: string;
  fabSet: string | null;
  rarity: string | null;
  puzzleMode: "fragments" | "sliding";
  difficulty: "easy" | "normal" | "hard";
  timeMs: number;
  moves: number;
  seed: string;
  templateId: string | null;
  completedAt: string;
};

export type FragmentsCardHighlight = {
  cardId: string;
  cardName: string;
  timesCompleted: number;
  bestTimeMs: number | null;
  bestMoves: number | null;
  averageTimeMs: string | null;
  averageMoves: string | null;
  lastCompletedAt: string | null;
};

export type FragmentsRarestHighlight = {
  cardId: string;
  cardName: string;
  cardImageUrl: string;
  fabSet: string | null;
  rarity: string | null;
};

export type FragmentsProfileHighlights = {
  fastestRestoration: FragmentsProfileCompletion | null;
  lowestMoveRestoration: FragmentsProfileCompletion | null;
  mostRestoredCard: FragmentsCardHighlight | null;
  rarestRestoredCard: FragmentsRarestHighlight | null;
  latestRestoration: FragmentsProfileCompletion | null;
};

export type FragmentsProfileResponse = {
  userId: string;
  summary: FragmentsSummary;
  recentCompletions: FragmentsProfileCompletion[];
  bestRuns: FragmentsProfileCompletion[];
  cardHighlights: FragmentsCardHighlight[];
  highlights: FragmentsProfileHighlights;
  setProgress: SetProgressRow[];
  modeBreakdown: FragmentsModeBreakdown;
  difficultyBreakdown: FragmentsDifficultyBreakdown;
};

export class FragmentsHttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function toPuzzleMode(mode: FragmentsCompletionInput["puzzleMode"]): FragmentPuzzleMode {
  if (mode === "fragments") return FragmentPuzzleMode.FRAGMENTS;
  if (mode === "sliding") return FragmentPuzzleMode.SLIDING;
  throw new FragmentsHttpError(400, "Invalid puzzleMode.");
}

function toDifficulty(level: FragmentsCompletionInput["difficulty"]): FragmentPuzzleDifficulty {
  if (level === "easy") return FragmentPuzzleDifficulty.EASY;
  if (level === "normal") return FragmentPuzzleDifficulty.NORMAL;
  if (level === "hard") return FragmentPuzzleDifficulty.HARD;
  throw new FragmentsHttpError(400, "Invalid difficulty.");
}

function normalizedText(raw: unknown, field: string, maxLen = 300): string {
  if (typeof raw !== "string") {
    throw new FragmentsHttpError(400, `Invalid ${field}.`);
  }
  const value = raw.trim();
  if (value.length === 0 || value.length > maxLen) {
    throw new FragmentsHttpError(400, `Invalid ${field}.`);
  }
  return value;
}

function normalizedNullableText(raw: unknown, maxLen = 300): string | null {
  if (raw == null) return null;
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (value.length === 0) return null;
  return value.slice(0, maxLen);
}

function validatedInt(raw: unknown, field: string, min: number, max: number): number {
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    throw new FragmentsHttpError(400, `Invalid ${field}.`);
  }
  const value = Math.floor(raw);
  if (value < min || value > max) {
    throw new FragmentsHttpError(400, `Invalid ${field}.`);
  }
  return value;
}

/**
 * v1 note: the backend trusts client completion payloads (no server-side puzzle verification yet).
 */
export function parseFragmentsCompletionInput(body: unknown): FragmentsCompletionInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const puzzleModeRaw = normalizedText(b.puzzleMode, "puzzleMode", 20).toLowerCase();
  const difficultyRaw = normalizedText(b.difficulty, "difficulty", 20).toLowerCase();
  if (puzzleModeRaw !== "fragments" && puzzleModeRaw !== "sliding") {
    throw new FragmentsHttpError(400, "Invalid puzzleMode.");
  }
  if (difficultyRaw !== "easy" && difficultyRaw !== "normal" && difficultyRaw !== "hard") {
    throw new FragmentsHttpError(400, "Invalid difficulty.");
  }

  return {
    runId: normalizedText(b.runId, "runId", 120),
    cardId: normalizedText(b.cardId, "cardId", 120),
    cardName: normalizedText(b.cardName, "cardName", 200),
    cardImageUrl: normalizedText(b.cardImageUrl, "cardImageUrl", 1000),
    fabSet: normalizedNullableText(b.fabSet, 120),
    rarity: normalizedNullableText(b.rarity, 80),
    puzzleMode: puzzleModeRaw,
    difficulty: difficultyRaw,
    timeMs: validatedInt(b.timeMs, "timeMs", 0, 86_400_000),
    moves: validatedInt(b.moves, "moves", 0, 1_000_000),
    seed: normalizedText(b.seed, "seed", 300),
    templateId: normalizedNullableText(b.templateId, 120),
  };
}

function decimalAverage(total: bigint, count: number): Prisma.Decimal | null {
  if (count <= 0) return null;
  const n = Number(total);
  if (!Number.isFinite(n)) return null;
  return new Prisma.Decimal(n / count);
}

export async function recordFragmentsCompletion(
  actor: Actor,
  input: FragmentsCompletionInput,
): Promise<{ persisted: boolean }> {
  if (actor.kind !== "user") {
    return { persisted: false };
  }
  const puzzleMode = toPuzzleMode(input.puzzleMode);
  const difficulty = toDifficulty(input.difficulty);
  const userId = actor.userId;
  const now = new Date();

  const applyCountBuckets = (stats: {
    fragmentsCount: number;
    slidingCount: number;
    easyCount: number;
    normalCount: number;
    hardCount: number;
  }) => {
    if (puzzleMode === FragmentPuzzleMode.FRAGMENTS) stats.fragmentsCount += 1;
    else stats.slidingCount += 1;
    if (difficulty === FragmentPuzzleDifficulty.EASY) stats.easyCount += 1;
    else if (difficulty === FragmentPuzzleDifficulty.NORMAL) stats.normalCount += 1;
    else stats.hardCount += 1;
  };

  try {
    const persisted = await prisma.$transaction(async (tx) => {
      const existingByRun = await tx.fragmentsCompletion.findUnique({
        where: { runId: input.runId },
        select: { userId: true },
      });
      if (existingByRun) {
        if (existingByRun.userId !== userId) {
          throw new FragmentsHttpError(409, "Completion runId already exists.");
        }
        return true;
      }

      await tx.fragmentsCompletion.create({
        data: {
          runId: input.runId,
          userId,
          cardId: input.cardId,
          cardName: input.cardName,
          cardImageUrl: input.cardImageUrl,
          fabSet: input.fabSet,
          rarity: input.rarity,
          puzzleMode,
          difficulty,
          timeMs: input.timeMs,
          moves: input.moves,
          seed: input.seed,
          templateId: input.templateId,
        },
      });

      const stat = await tx.userFragmentsStat.findUnique({ where: { userId } });
      if (!stat) {
        const newStats = {
          fragmentsCount: 0,
          slidingCount: 0,
          easyCount: 0,
          normalCount: 0,
          hardCount: 0,
        };
        applyCountBuckets(newStats);
        await tx.userFragmentsStat.create({
          data: {
            userId,
            puzzlesCompleted: 1,
            totalTimeMs: BigInt(input.timeMs),
            totalMoves: BigInt(input.moves),
            bestTimeMs: input.timeMs,
            bestMoves: input.moves,
            averageTimeMs: new Prisma.Decimal(input.timeMs),
            averageMoves: new Prisma.Decimal(input.moves),
            lastCompletedAt: now,
            fragmentsCount: newStats.fragmentsCount,
            slidingCount: newStats.slidingCount,
            easyCount: newStats.easyCount,
            normalCount: newStats.normalCount,
            hardCount: newStats.hardCount,
          },
        });
      } else {
        const puzzlesCompleted = stat.puzzlesCompleted + 1;
        const totalTimeMs = BigInt(stat.totalTimeMs) + BigInt(input.timeMs);
        const totalMoves = BigInt(stat.totalMoves) + BigInt(input.moves);
        const bestTimeMs =
          stat.bestTimeMs == null ? input.timeMs : Math.min(stat.bestTimeMs, input.timeMs);
        const bestMoves = stat.bestMoves == null ? input.moves : Math.min(stat.bestMoves, input.moves);
        const counts = {
          fragmentsCount: stat.fragmentsCount,
          slidingCount: stat.slidingCount,
          easyCount: stat.easyCount,
          normalCount: stat.normalCount,
          hardCount: stat.hardCount,
        };
        applyCountBuckets(counts);
        await tx.userFragmentsStat.update({
          where: { userId },
          data: {
            puzzlesCompleted,
            totalTimeMs,
            totalMoves,
            bestTimeMs,
            bestMoves,
            averageTimeMs: decimalAverage(totalTimeMs, puzzlesCompleted),
            averageMoves: decimalAverage(totalMoves, puzzlesCompleted),
            lastCompletedAt: now,
            fragmentsCount: counts.fragmentsCount,
            slidingCount: counts.slidingCount,
            easyCount: counts.easyCount,
            normalCount: counts.normalCount,
            hardCount: counts.hardCount,
          },
        });
      }

      const cardStat = await tx.userFragmentsCardStat.findUnique({
        where: { userId_cardId: { userId, cardId: input.cardId } },
      });
      if (!cardStat) {
        await tx.userFragmentsCardStat.create({
          data: {
            userId,
            cardId: input.cardId,
            cardName: input.cardName,
            timesCompleted: 1,
            totalTimeMs: BigInt(input.timeMs),
            totalMoves: BigInt(input.moves),
            bestTimeMs: input.timeMs,
            bestMoves: input.moves,
            averageTimeMs: new Prisma.Decimal(input.timeMs),
            averageMoves: new Prisma.Decimal(input.moves),
            lastCompletedAt: now,
          },
        });
      } else {
        const timesCompleted = cardStat.timesCompleted + 1;
        const totalTimeMs = BigInt(cardStat.totalTimeMs) + BigInt(input.timeMs);
        const totalMoves = BigInt(cardStat.totalMoves) + BigInt(input.moves);
        await tx.userFragmentsCardStat.update({
          where: { userId_cardId: { userId, cardId: input.cardId } },
          data: {
            cardName: input.cardName,
            timesCompleted,
            totalTimeMs,
            totalMoves,
            bestTimeMs:
              cardStat.bestTimeMs == null ? input.timeMs : Math.min(cardStat.bestTimeMs, input.timeMs),
            bestMoves: cardStat.bestMoves == null ? input.moves : Math.min(cardStat.bestMoves, input.moves),
            averageTimeMs: decimalAverage(totalTimeMs, timesCompleted),
            averageMoves: decimalAverage(totalMoves, timesCompleted),
            lastCompletedAt: now,
          },
        });
      }

      return true;
    });
    return { persisted };
  } catch (e) {
    if (
      typeof e === "object" &&
      e != null &&
      "code" in e &&
      (e as { code?: string }).code === "P2002"
    ) {
      const existing = await prisma.fragmentsCompletion.findUnique({
        where: { runId: input.runId },
        select: { userId: true },
      });
      if (existing?.userId === userId) {
        return { persisted: true };
      }
      throw new FragmentsHttpError(409, "Completion runId already exists.");
    }
    throw e;
  }
}

function toModeWire(mode: FragmentPuzzleMode): "fragments" | "sliding" {
  return mode === FragmentPuzzleMode.FRAGMENTS ? "fragments" : "sliding";
}

function toDifficultyWire(difficulty: FragmentPuzzleDifficulty): "easy" | "normal" | "hard" {
  if (difficulty === FragmentPuzzleDifficulty.EASY) return "easy";
  if (difficulty === FragmentPuzzleDifficulty.NORMAL) return "normal";
  return "hard";
}

function emptyFragmentsSummary(): FragmentsSummary {
  return {
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
  };
}

function cardStatToHighlight(row: {
  cardId: string;
  cardName: string;
  timesCompleted: number;
  bestTimeMs: number | null;
  bestMoves: number | null;
  averageTimeMs: Prisma.Decimal | null;
  averageMoves: Prisma.Decimal | null;
  lastCompletedAt: Date | null;
}): FragmentsCardHighlight {
  return {
    cardId: row.cardId,
    cardName: row.cardName,
    timesCompleted: row.timesCompleted,
    bestTimeMs: row.bestTimeMs,
    bestMoves: row.bestMoves,
    averageTimeMs: row.averageTimeMs != null ? String(row.averageTimeMs) : null,
    averageMoves: row.averageMoves != null ? String(row.averageMoves) : null,
    lastCompletedAt: row.lastCompletedAt?.toISOString() ?? null,
  };
}


export async function getFragmentsProfileByUserId(
  userId: string,
): Promise<FragmentsProfileResponse | null> {
  if (!isValidProfileUserId(userId)) {
    return null;
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    return null;
  }

  const [
    stat,
    recentRows,
    bestRows,
    cardRows,
    modeGroups,
    difficultyGroups,
    uniqueCardGroups,
    setPairGroups,
    fastestRow,
    fewestMovesRow,
    topCardStat,
    rarestRows,
  ] = await Promise.all([
    prisma.userFragmentsStat.findUnique({ where: { userId } }),
    prisma.fragmentsCompletion.findMany({
      where: { userId },
      orderBy: { completedAt: "desc" },
      take: 15,
    }),
    prisma.fragmentsCompletion.findMany({
      where: { userId },
      orderBy: [{ timeMs: "asc" }, { moves: "asc" }, { completedAt: "desc" }],
      take: 8,
    }),
    prisma.userFragmentsCardStat.findMany({
      where: { userId },
      orderBy: [{ timesCompleted: "desc" }, { lastCompletedAt: "desc" }],
      take: 6,
    }),
    prisma.fragmentsCompletion.groupBy({
      by: ["puzzleMode"],
      where: { userId },
      _count: { _all: true },
      _avg: { timeMs: true, moves: true },
    }),
    prisma.fragmentsCompletion.groupBy({
      by: ["difficulty"],
      where: { userId },
      _count: { _all: true },
      _avg: { timeMs: true, moves: true },
    }),
    prisma.fragmentsCompletion.groupBy({
      by: ["cardId"],
      where: { userId },
    }),
    prisma.fragmentsCompletion.groupBy({
      by: ["fabSet", "cardId"],
      where: { userId, fabSet: { not: null } },
    }),
    prisma.fragmentsCompletion.findFirst({
      where: { userId },
      orderBy: [{ timeMs: "asc" }, { moves: "asc" }, { completedAt: "desc" }],
    }),
    prisma.fragmentsCompletion.findFirst({
      where: { userId },
      orderBy: [{ moves: "asc" }, { timeMs: "asc" }, { completedAt: "desc" }],
    }),
    prisma.userFragmentsCardStat.findFirst({
      where: { userId },
      orderBy: [{ timesCompleted: "desc" }, { lastCompletedAt: "desc" }],
    }),
    prisma.$queryRaw<RarestCandidate[]>`
      SELECT DISTINCT ON (fc.card_id)
        fc.card_id AS "cardId",
        fc.card_name AS "cardName",
        fc.card_image_url AS "cardImageUrl",
        fc.fab_set AS "fabSet",
        fc.rarity AS "rarity"
      FROM fragments_completions fc
      WHERE fc.user_id = ${userId}::uuid
      ORDER BY
        fc.card_id,
        (
          CASE COALESCE(TRIM(fc.rarity), '')
            WHEN 'Fabled' THEN 60
            WHEN 'Legendary' THEN 50
            WHEN 'Majestic' THEN 40
            WHEN 'Super Rare' THEN 30
            WHEN 'Rare' THEN 20
            WHEN 'Common' THEN 10
            WHEN 'Token' THEN 0
            WHEN 'Promo' THEN 5
            WHEN 'Marvel' THEN 65
            ELSE 15
          END
        ) DESC,
        fc.completed_at DESC
    `,
  ]);

  const lastRun = recentRows[0];
  const summary: FragmentsSummary = stat
    ? {
        puzzlesCompleted: stat.puzzlesCompleted,
        uniqueCardsRestored: uniqueCardGroups.length,
        averageTimeMs: stat.averageTimeMs != null ? String(stat.averageTimeMs) : null,
        averageMoves: stat.averageMoves != null ? String(stat.averageMoves) : null,
        bestTimeMs: stat.bestTimeMs,
        bestMoves: stat.bestMoves,
        lastCompletedAt: stat.lastCompletedAt?.toISOString() ?? null,
        totalRestorationTimeMs: stat.totalTimeMs.toString(),
        lastRestoredCardName: lastRun?.cardName ?? null,
        lastRestoredCardId: lastRun?.cardId ?? null,
        lastRestoredSet: lastRun?.fabSet ?? null,
        fragmentsCount: stat.fragmentsCount,
        slidingCount: stat.slidingCount,
        easyCount: stat.easyCount,
        normalCount: stat.normalCount,
        hardCount: stat.hardCount,
      }
    : {
        ...emptyFragmentsSummary(),
        uniqueCardsRestored: uniqueCardGroups.length,
        lastRestoredCardName: lastRun?.cardName ?? null,
        lastRestoredCardId: lastRun?.cardId ?? null,
        lastRestoredSet: lastRun?.fabSet ?? null,
      };

  const toCompletion = (row: {
    runId: string;
    cardId: string;
    cardName: string;
    cardImageUrl: string;
    fabSet: string | null;
    rarity: string | null;
    puzzleMode: FragmentPuzzleMode;
    difficulty: FragmentPuzzleDifficulty;
    timeMs: number;
    moves: number;
    seed: string;
    templateId: string | null;
    completedAt: Date;
  }): FragmentsProfileCompletion => ({
    runId: row.runId,
    cardId: row.cardId,
    cardName: row.cardName,
    cardImageUrl: row.cardImageUrl,
    fabSet: row.fabSet,
    rarity: row.rarity,
    puzzleMode: toModeWire(row.puzzleMode),
    difficulty: toDifficultyWire(row.difficulty),
    timeMs: row.timeMs,
    moves: row.moves,
    seed: row.seed,
    templateId: row.templateId,
    completedAt: row.completedAt.toISOString(),
  });

  const catalogSizes = getPlayablePrintingCountBySet();
  const allSetNames = getAllSets();
  const setPairs = setPairGroups.map((g) => ({
    fabSet: g.fabSet,
    cardId: g.cardId,
  }));
  const setProgress = buildSetProgress(setPairs, catalogSizes, allSetNames);

  const modeBreakdown = buildModeBreakdownFromGroups(modeGroups);
  const difficultyBreakdown = buildDifficultyBreakdownFromGroups(difficultyGroups);

  const rarestWinner = pickRarestRestoredCard(rarestRows);
  const rarestRestoredCard: FragmentsRarestHighlight | null = rarestWinner
    ? {
        cardId: rarestWinner.cardId,
        cardName: rarestWinner.cardName,
        cardImageUrl: rarestWinner.cardImageUrl,
        fabSet: rarestWinner.fabSet,
        rarity: rarestWinner.rarity,
      }
    : null;

  const recentMapped = recentRows.map(toCompletion);
  const highlights: FragmentsProfileHighlights = {
    fastestRestoration: fastestRow ? toCompletion(fastestRow) : null,
    lowestMoveRestoration: fewestMovesRow ? toCompletion(fewestMovesRow) : null,
    mostRestoredCard: topCardStat ? cardStatToHighlight(topCardStat) : null,
    rarestRestoredCard,
    latestRestoration: recentMapped[0] ?? null,
  };

  return {
    userId,
    summary,
    recentCompletions: recentMapped,
    bestRuns: bestRows.map(toCompletion),
    cardHighlights: cardRows.map(cardStatToHighlight),
    highlights,
    setProgress,
    modeBreakdown,
    difficultyBreakdown,
  };
}
