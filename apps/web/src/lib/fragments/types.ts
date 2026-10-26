export type FragmentsModeBucket = {
  completions: number;
  averageTimeMs: string | null;
  averageMoves: string | null;
};

export type FragmentsModeBreakdown = {
  fragments: FragmentsModeBucket;
  sliding: FragmentsModeBucket;
};

export type FragmentsDifficultyBreakdown = {
  easy: FragmentsModeBucket;
  normal: FragmentsModeBucket;
  hard: FragmentsModeBucket;
};

export type FragmentsSetProgressRow = {
  setName: string;
  restoredUniqueCount: number;
  availableInCatalog: number;
  percentRestored: number;
};

export type FragmentsSummary = {
  puzzlesCompleted: number;
  uniqueCardsRestored: number;
  averageTimeMs: string | null;
  averageMoves: string | null;
  bestTimeMs: number | null;
  bestMoves: number | null;
  lastCompletedAt: string | null;
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
  highlights?: FragmentsProfileHighlights;
  setProgress?: FragmentsSetProgressRow[];
  modeBreakdown?: FragmentsModeBreakdown;
  difficultyBreakdown?: FragmentsDifficultyBreakdown;
};

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

