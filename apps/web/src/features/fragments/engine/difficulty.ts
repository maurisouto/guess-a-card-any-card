import type { PuzzleDifficulty, PuzzleGrid } from "./types";

export const PUZZLE_GRIDS: Record<PuzzleDifficulty, PuzzleGrid> = {
  easy: { cols: 3, rows: 4 },
  normal: { cols: 4, rows: 5 },
  hard: { cols: 5, rows: 6 },
};

export function getPuzzleGridForDifficulty(difficulty: PuzzleDifficulty): PuzzleGrid {
  return PUZZLE_GRIDS[difficulty];
}
