import { FragmentPuzzleDifficulty, FragmentPuzzleMode } from "@/generated/prisma/client";

/** Higher = rarer for sorting “rarest restored”. */
export function rarityRestorationRank(rarity: string | null | undefined): number {
  if (rarity == null || rarity.trim() === "") return -1;
  const key = rarity.trim();
  const table: Record<string, number> = {
    Token: 0,
    Common: 10,
    Rare: 20,
    "Super Rare": 30,
    Majestic: 40,
    Legendary: 50,
    Fabled: 60,
    Marvel: 65,
    Promo: 5,
  };
  return table[key] ?? 15;
}

export type ModeBucketStats = {
  completions: number;
  averageTimeMs: string | null;
  averageMoves: string | null;
};

export type FragmentsModeBreakdown = {
  fragments: ModeBucketStats;
  sliding: ModeBucketStats;
};

export type FragmentsDifficultyBreakdown = {
  easy: ModeBucketStats;
  normal: ModeBucketStats;
  hard: ModeBucketStats;
};

function emptyBucket(): ModeBucketStats {
  return { completions: 0, averageTimeMs: null, averageMoves: null };
}

/** Prisma `groupBy` averages may be number or Decimal — normalize for JSON. */
function toFiniteNumber(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "object" && v != null && "toNumber" in v) {
    const n = (v as { toNumber: () => number }).toNumber();
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function bucketFromGroup(
  count: number,
  avgTime: number | null | undefined,
  avgMoves: number | null | undefined,
): ModeBucketStats {
  if (count <= 0) return emptyBucket();
  return {
    completions: count,
    averageTimeMs: avgTime != null && Number.isFinite(avgTime) ? avgTime.toFixed(2) : null,
    averageMoves: avgMoves != null && Number.isFinite(avgMoves) ? avgMoves.toFixed(2) : null,
  };
}

/** Prisma groupBy row shape for mode / difficulty. */
export function buildModeBreakdownFromGroups(
  rows: Array<{
    puzzleMode: FragmentPuzzleMode;
    _count: { _all: number };
    _avg: { timeMs: number | null; moves: number | null };
  }>,
): FragmentsModeBreakdown {
  const out: FragmentsModeBreakdown = {
    fragments: emptyBucket(),
    sliding: emptyBucket(),
  };
  for (const r of rows) {
    const b = bucketFromGroup(
      r._count._all,
      toFiniteNumber(r._avg.timeMs),
      toFiniteNumber(r._avg.moves),
    );
    if (r.puzzleMode === FragmentPuzzleMode.FRAGMENTS) out.fragments = b;
    else if (r.puzzleMode === FragmentPuzzleMode.SLIDING) out.sliding = b;
  }
  return out;
}

export function buildDifficultyBreakdownFromGroups(
  rows: Array<{
    difficulty: FragmentPuzzleDifficulty;
    _count: { _all: number };
    _avg: { timeMs: number | null; moves: number | null };
  }>,
): FragmentsDifficultyBreakdown {
  const out: FragmentsDifficultyBreakdown = {
    easy: emptyBucket(),
    normal: emptyBucket(),
    hard: emptyBucket(),
  };
  for (const r of rows) {
    const b = bucketFromGroup(
      r._count._all,
      toFiniteNumber(r._avg.timeMs),
      toFiniteNumber(r._avg.moves),
    );
    if (r.difficulty === FragmentPuzzleDifficulty.EASY) out.easy = b;
    else if (r.difficulty === FragmentPuzzleDifficulty.NORMAL) out.normal = b;
    else if (r.difficulty === FragmentPuzzleDifficulty.HARD) out.hard = b;
  }
  return out;
}

export type SetProgressRow = {
  setName: string;
  restoredUniqueCount: number;
  availableInCatalog: number;
  percentRestored: number;
};

/**
 * `pairs`: distinct (fabSet, cardId) from user completions (fabSet non-null).
 * `catalogSizeBySet`: playable catalog row count per set name.
 */
export function buildSetProgress(
  pairs: Array<{ fabSet: string | null; cardId: string }>,
  catalogSizeBySet: Map<string, number>,
  allSetNames: string[],
): SetProgressRow[] {
  const restoredBySet = new Map<string, Set<string>>();
  for (const p of pairs) {
    if (p.fabSet == null || p.fabSet.trim() === "") continue;
    const set = p.fabSet.trim();
    if (!restoredBySet.has(set)) restoredBySet.set(set, new Set());
    restoredBySet.get(set)!.add(p.cardId);
  }

  const rows: SetProgressRow[] = allSetNames.map((setName) => {
    const available = catalogSizeBySet.get(setName) ?? 0;
    const restored = restoredBySet.get(setName)?.size ?? 0;
    const percent =
      available > 0 ? Math.round((1000 * restored) / available) / 10 : restored > 0 ? 100 : 0;
    return {
      setName,
      restoredUniqueCount: restored,
      availableInCatalog: available,
      percentRestored: percent,
    };
  });

  rows.sort((a, b) => {
    const aActive = a.restoredUniqueCount > 0 ? 1 : 0;
    const bActive = b.restoredUniqueCount > 0 ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    if (a.percentRestored !== b.percentRestored) return b.percentRestored - a.percentRestored;
    return a.setName.localeCompare(b.setName, undefined, { sensitivity: "base" });
  });

  return rows;
}

export type RarestCandidate = {
  cardId: string;
  cardName: string;
  cardImageUrl: string;
  fabSet: string | null;
  rarity: string | null;
};

/** Pick the best rarity per card, then the card with highest rarity rank. */
export function pickRarestRestoredCard(rows: RarestCandidate[]): RarestCandidate | null {
  if (rows.length === 0) return null;
  const bestPerCard = new Map<string, RarestCandidate>();
  for (const row of rows) {
    const prev = bestPerCard.get(row.cardId);
    if (!prev) {
      bestPerCard.set(row.cardId, row);
      continue;
    }
    const rNew = rarityRestorationRank(row.rarity);
    const rOld = rarityRestorationRank(prev.rarity);
    if (rNew > rOld) bestPerCard.set(row.cardId, row);
  }
  let winner: RarestCandidate | null = null;
  let bestRank = -1;
  for (const c of bestPerCard.values()) {
    const r = rarityRestorationRank(c.rarity);
    if (r > bestRank) {
      bestRank = r;
      winner = c;
    }
  }
  return winner;
}
