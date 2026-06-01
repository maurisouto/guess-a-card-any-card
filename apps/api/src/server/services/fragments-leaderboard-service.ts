/**
 * Fragments-only leaderboards (Phase 6).
 *
 * Limitations: completion payloads are client-trusted (same as profile). Rows use only light
 * validity gates (time/move bounds) to hide obvious garbage — not an anti-cheat system.
 */
import { FragmentPuzzleDifficulty, FragmentPuzzleMode, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { FragmentsHttpError } from "@/server/services/fragments-service";

/** v1: client-submitted runs are trusted; these bounds reduce obvious garbage rows only. */
export const FRAGMENTS_LB_MIN_TIME_MS = 500;
export const FRAGMENTS_LB_MAX_TIME_MS = 86_400_000;
export const FRAGMENTS_LB_MIN_MOVES = 1;

export type FragmentsLeaderboardCategory =
  | "fastest"
  | "fewest_moves"
  | "most_restorations"
  | "most_unique_cards";

export type FragmentsLeaderboardModeFilter = "all" | "fragments" | "sliding";
export type FragmentsLeaderboardDifficultyFilter = "all" | "easy" | "normal" | "hard";

export type FragmentsLeaderboardEntry = {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  /** Primary metric for the category (time ms, move count, or aggregate count). */
  value: number;
  timeMs?: number | null;
  moves?: number | null;
  uniqueCardsRestored?: number | null;
  puzzlesCompleted?: number | null;
  cardName?: string | null;
  fabSet?: string | null;
  rarity?: string | null;
  completedAt?: string | null;
};

export type FragmentsLeaderboardResponse = {
  category: FragmentsLeaderboardCategory;
  mode: FragmentsLeaderboardModeFilter;
  difficulty: FragmentsLeaderboardDifficultyFilter;
  limit: number;
  offset: number;
  hasMore: boolean;
  entries: FragmentsLeaderboardEntry[];
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function parseCategory(raw: string | undefined): FragmentsLeaderboardCategory {
  const c = (raw ?? "fastest").trim().toLowerCase();
  if (c === "fastest" || c === "fastest_restoration" || c === "fastest_restorations") return "fastest";
  if (c === "fewest" || c === "fewest_moves" || c === "fewest_move") return "fewest_moves";
  if (c === "most" || c === "most_restorations" || c === "most_restoration") return "most_restorations";
  if (c === "unique" || c === "most_unique" || c === "most_unique_cards" || c === "unique_cards") {
    return "most_unique_cards";
  }
  throw new FragmentsHttpError(400, "Invalid category.");
}

function parseMode(raw: string | undefined): FragmentsLeaderboardModeFilter {
  const m = (raw ?? "all").trim().toLowerCase();
  if (m === "all" || m === "") return "all";
  if (m === "fragments" || m === "fragment") return "fragments";
  if (m === "sliding") return "sliding";
  throw new FragmentsHttpError(400, "Invalid mode filter.");
}

function parseDifficulty(raw: string | undefined): FragmentsLeaderboardDifficultyFilter {
  const d = (raw ?? "all").trim().toLowerCase();
  if (d === "all" || d === "") return "all";
  if (d === "easy") return "easy";
  if (d === "normal") return "normal";
  if (d === "hard") return "hard";
  throw new FragmentsHttpError(400, "Invalid difficulty filter.");
}

function parseLimit(raw: string | null | undefined): number {
  if (raw == null || raw === "") return DEFAULT_LIMIT;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

function parseOffset(raw: string | null | undefined): number {
  if (raw == null || raw === "") return 0;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 50_000);
}

function toPrismaMode(m: FragmentsLeaderboardModeFilter): FragmentPuzzleMode | undefined {
  if (m === "fragments") return FragmentPuzzleMode.FRAGMENTS;
  if (m === "sliding") return FragmentPuzzleMode.SLIDING;
  return undefined;
}

function toPrismaDifficulty(
  d: FragmentsLeaderboardDifficultyFilter,
): FragmentPuzzleDifficulty | undefined {
  if (d === "easy") return FragmentPuzzleDifficulty.EASY;
  if (d === "normal") return FragmentPuzzleDifficulty.NORMAL;
  if (d === "hard") return FragmentPuzzleDifficulty.HARD;
  return undefined;
}

export function parseFragmentsLeaderboardQuery(searchParams: URLSearchParams): {
  category: FragmentsLeaderboardCategory;
  mode: FragmentsLeaderboardModeFilter;
  difficulty: FragmentsLeaderboardDifficultyFilter;
  limit: number;
  offset: number;
} {
  return {
    category: parseCategory(searchParams.get("category") ?? undefined),
    mode: parseMode(searchParams.get("mode") ?? undefined),
    difficulty: parseDifficulty(searchParams.get("difficulty") ?? undefined),
    limit: parseLimit(searchParams.get("limit")),
    offset: parseOffset(searchParams.get("offset")),
  };
}

function completionWhere(
  mode: FragmentsLeaderboardModeFilter,
  difficulty: FragmentsLeaderboardDifficultyFilter,
): Prisma.FragmentsCompletionWhereInput {
  const pm = toPrismaMode(mode);
  const df = toPrismaDifficulty(difficulty);
  return {
    timeMs: { gte: FRAGMENTS_LB_MIN_TIME_MS, lte: FRAGMENTS_LB_MAX_TIME_MS },
    moves: { gte: FRAGMENTS_LB_MIN_MOVES },
    ...(pm != null ? { puzzleMode: pm } : {}),
    ...(df != null ? { difficulty: df } : {}),
  };
}

async function queryFastestOrFewest(
  category: "fastest" | "fewest_moves",
  mode: FragmentsLeaderboardModeFilter,
  difficulty: FragmentsLeaderboardDifficultyFilter,
  limit: number,
  offset: number,
): Promise<{ entries: FragmentsLeaderboardEntry[]; hasMore: boolean }> {
  const where = completionWhere(mode, difficulty);
  const orderBy: Prisma.FragmentsCompletionOrderByWithRelationInput[] =
    category === "fastest"
      ? [{ timeMs: "asc" }, { moves: "asc" }, { completedAt: "asc" }]
      : [{ moves: "asc" }, { timeMs: "asc" }, { completedAt: "asc" }];

  const rows = await prisma.fragmentsCompletion.findMany({
    where,
    orderBy,
    take: limit + 1,
    skip: offset,
    select: {
      userId: true,
      cardName: true,
      fabSet: true,
      rarity: true,
      timeMs: true,
      moves: true,
      completedAt: true,
      user: { select: { displayName: true, avatarUrl: true } },
    },
  });

  const hasMore = rows.length > limit;
  const sliced = rows.slice(0, limit);
  const entries = sliced.map((r, i) => ({
    rank: offset + i + 1,
    userId: r.userId,
    username: r.user.displayName,
    avatarUrl: r.user.avatarUrl,
    value: category === "fastest" ? r.timeMs : r.moves,
    timeMs: r.timeMs,
    moves: r.moves,
    cardName: r.cardName,
    fabSet: r.fabSet,
    rarity: r.rarity,
    completedAt: r.completedAt.toISOString(),
  }));
  return { entries, hasMore };
}

type AggregateRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  run_count: bigint;
  unique_cards: bigint;
  last_at: Date;
};

function aggregateFilterSql(
  mode: FragmentsLeaderboardModeFilter,
  difficulty: FragmentsLeaderboardDifficultyFilter,
): { modeSql: Prisma.Sql; diffSql: Prisma.Sql } {
  const pm = toPrismaMode(mode);
  const df = toPrismaDifficulty(difficulty);
  const modeSql =
    pm === FragmentPuzzleMode.FRAGMENTS
      ? Prisma.sql`AND fc.puzzle_mode = 'FRAGMENTS'::"FragmentPuzzleMode"`
      : pm === FragmentPuzzleMode.SLIDING
        ? Prisma.sql`AND fc.puzzle_mode = 'SLIDING'::"FragmentPuzzleMode"`
        : Prisma.empty;
  const diffSql =
    df === FragmentPuzzleDifficulty.EASY
      ? Prisma.sql`AND fc.difficulty = 'EASY'::"FragmentPuzzleDifficulty"`
      : df === FragmentPuzzleDifficulty.NORMAL
        ? Prisma.sql`AND fc.difficulty = 'NORMAL'::"FragmentPuzzleDifficulty"`
        : df === FragmentPuzzleDifficulty.HARD
          ? Prisma.sql`AND fc.difficulty = 'HARD'::"FragmentPuzzleDifficulty"`
          : Prisma.empty;
  return { modeSql, diffSql };
}

async function queryAggregateLeaderboard(
  sort: "most_restorations" | "most_unique_cards",
  mode: FragmentsLeaderboardModeFilter,
  difficulty: FragmentsLeaderboardDifficultyFilter,
  limit: number,
  offset: number,
): Promise<{ entries: FragmentsLeaderboardEntry[]; hasMore: boolean }> {
  const { modeSql, diffSql } = aggregateFilterSql(mode, difficulty);

  const rows =
    sort === "most_restorations"
      ? await prisma.$queryRaw<AggregateRow[]>`
        SELECT
          fc.user_id::text AS user_id,
          u.display_name AS display_name,
          u.avatar_url AS avatar_url,
          COUNT(*)::bigint AS run_count,
          COUNT(DISTINCT fc.card_id)::bigint AS unique_cards,
          MAX(fc.completed_at) AS last_at
        FROM fragments_completions fc
        INNER JOIN users u ON u.id = fc.user_id
        WHERE fc.time_ms >= ${FRAGMENTS_LB_MIN_TIME_MS}
          AND fc.time_ms <= ${FRAGMENTS_LB_MAX_TIME_MS}
          AND fc.moves >= ${FRAGMENTS_LB_MIN_MOVES}
          ${modeSql}
          ${diffSql}
        GROUP BY fc.user_id, u.display_name, u.avatar_url
        ORDER BY run_count DESC, unique_cards DESC, last_at ASC NULLS LAST
        LIMIT ${limit + 1} OFFSET ${offset}
      `
      : await prisma.$queryRaw<AggregateRow[]>`
        SELECT
          fc.user_id::text AS user_id,
          u.display_name AS display_name,
          u.avatar_url AS avatar_url,
          COUNT(*)::bigint AS run_count,
          COUNT(DISTINCT fc.card_id)::bigint AS unique_cards,
          MAX(fc.completed_at) AS last_at
        FROM fragments_completions fc
        INNER JOIN users u ON u.id = fc.user_id
        WHERE fc.time_ms >= ${FRAGMENTS_LB_MIN_TIME_MS}
          AND fc.time_ms <= ${FRAGMENTS_LB_MAX_TIME_MS}
          AND fc.moves >= ${FRAGMENTS_LB_MIN_MOVES}
          ${modeSql}
          ${diffSql}
        GROUP BY fc.user_id, u.display_name, u.avatar_url
        ORDER BY unique_cards DESC, run_count DESC, last_at ASC NULLS LAST
        LIMIT ${limit + 1} OFFSET ${offset}
      `;

  const hasMore = rows.length > limit;
  const sliced = rows.slice(0, limit);
  const entries = sliced.map((r, i) => {
    const runCount = Number(r.run_count);
    const unique = Number(r.unique_cards);
    return {
      rank: offset + i + 1,
      userId: r.user_id,
      username: r.display_name,
      avatarUrl: r.avatar_url,
      value: sort === "most_restorations" ? runCount : unique,
      puzzlesCompleted: runCount,
      uniqueCardsRestored: unique,
      completedAt: r.last_at.toISOString(),
    };
  });
  return { entries, hasMore };
}

export async function getFragmentsLeaderboard(
  searchParams: URLSearchParams,
): Promise<FragmentsLeaderboardResponse> {
  const { category, mode, difficulty, limit, offset } = parseFragmentsLeaderboardQuery(searchParams);

  let entries: FragmentsLeaderboardEntry[];
  let hasMore: boolean;
  if (category === "fastest") {
    ({ entries, hasMore } = await queryFastestOrFewest("fastest", mode, difficulty, limit, offset));
  } else if (category === "fewest_moves") {
    ({ entries, hasMore } = await queryFastestOrFewest("fewest_moves", mode, difficulty, limit, offset));
  } else if (category === "most_restorations") {
    ({ entries, hasMore } = await queryAggregateLeaderboard("most_restorations", mode, difficulty, limit, offset));
  } else {
    ({ entries, hasMore } = await queryAggregateLeaderboard("most_unique_cards", mode, difficulty, limit, offset));
  }

  return {
    category,
    mode,
    difficulty,
    limit,
    offset,
    hasMore,
    entries,
  };
}
