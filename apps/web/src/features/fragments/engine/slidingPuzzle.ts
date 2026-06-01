import { createSeededRandom } from "@/lib/utils/seededRandom";

import { getPuzzleGridForDifficulty } from "./difficulty";
import type { PuzzleDifficulty } from "./types";
import type { SlidingPuzzleState } from "./types";

function linearIndex(col: number, row: number, cols: number): number {
  return row * cols + col;
}

function neighborsOfIndex(index: number, cols: number, rows: number): number[] {
  const col = index % cols;
  const row = Math.floor(index / cols);
  const out: number[] = [];
  if (col > 0) out.push(linearIndex(col - 1, row, cols));
  if (col < cols - 1) out.push(linearIndex(col + 1, row, cols));
  if (row > 0) out.push(linearIndex(col, row - 1, cols));
  if (row < rows - 1) out.push(linearIndex(col, row + 1, cols));
  return out;
}

/** Inversions on the sequence of tile ids excluding the empty tile. */
export function slidingPuzzleInversionCount(cells: number[], emptyTileId: number): number {
  const seq = cells.filter((id) => id !== emptyTileId);
  let inv = 0;
  for (let i = 0; i < seq.length; i++) {
    for (let j = i + 1; j < seq.length; j++) {
      if (seq[i]! > seq[j]!) inv++;
    }
  }
  return inv;
}

/**
 * Classic solvability for the n × m sliding puzzle with empty on last cell in reading order.
 * - Odd width: solvable iff inversions even.
 * - Even width: solvable iff inversions + (row of blank from bottom, 1-based) is odd.
 */
export function isSlidingConfigurationSolvable(
  cells: number[],
  cols: number,
  rows: number,
  emptyTileId: number,
): boolean {
  const emptyIndex = cells.indexOf(emptyTileId);
  if (emptyIndex < 0) return false;
  const inversions = slidingPuzzleInversionCount(cells, emptyTileId);
  const blankRowFromBottom = rows - Math.floor(emptyIndex / cols);

  if (cols % 2 === 1) {
    return inversions % 2 === 0;
  }
  return (inversions + blankRowFromBottom) % 2 === 1;
}

function solvedCellsForGrid(cols: number, rows: number): number[] {
  const n = cols * rows;
  return Array.from({ length: n }, (_, i) => i);
}

function isSolvedCells(cells: number[]): boolean {
  return cells.every((v, i) => v === i);
}

function swapCells(cells: readonly number[], a: number, b: number): number[] {
  const next = [...cells];
  [next[a], next[b]] = [next[b]!, next[a]!];
  return next;
}

export function buildSlidingPuzzle(difficulty: PuzzleDifficulty, seed: string): SlidingPuzzleState {
  const grid = getPuzzleGridForDifficulty(difficulty);
  const { cols, rows } = grid;
  const n = cols * rows;
  const emptyTileId = n - 1;
  const solved = solvedCellsForGrid(cols, rows);

  let cells = [...solved];
  let emptyIndex = cells.indexOf(emptyTileId);
  const rand = createSeededRandom(`${seed}:sliding:shuffle`);
  const scrambleMoves = 120 + Math.floor(rand() * 180);

  for (let m = 0; m < scrambleMoves; m++) {
    const neigh = neighborsOfIndex(emptyIndex, cols, rows);
    const pick = neigh[Math.floor(rand() * neigh.length)]!;
    cells = swapCells(cells, emptyIndex, pick);
    emptyIndex = pick;
  }

  if (isSolvedCells(cells)) {
    const neigh = neighborsOfIndex(emptyIndex, cols, rows);
    const pick = neigh[Math.floor(rand() * neigh.length)]!;
    cells = swapCells(cells, emptyIndex, pick);
    emptyIndex = pick;
  }

  if (!isSlidingConfigurationSolvable(cells, cols, rows, emptyTileId)) {
    const nonEmptyIdx = cells
      .map((id, i) => (id === emptyTileId ? -1 : i))
      .filter((i): i is number => i >= 0);
    const a = nonEmptyIdx[0]!;
    const b = nonEmptyIdx[1]!;
    cells = swapCells(cells, a, b);
  }

  return {
    difficulty,
    grid: { cols, rows },
    cells,
    emptyTileId,
    emptyIndex: cells.indexOf(emptyTileId),
    solvedCells: solved,
    moveCount: 0,
  };
}

export type MoveSlidingTileResult = {
  state: SlidingPuzzleState;
  moved: boolean;
};

function indexOfTile(state: SlidingPuzzleState, tileId: number): number {
  return state.cells.indexOf(tileId);
}

export function canMoveTile(state: SlidingPuzzleState, tileId: number): boolean {
  const { cols, rows } = state.grid;
  const pos = indexOfTile(state, tileId);
  if (pos < 0 || tileId === state.emptyTileId) return false;
  const neigh = neighborsOfIndex(state.emptyIndex, cols, rows);
  return neigh.includes(pos);
}

/**
 * Moves the tile identified by `tileId` into the empty cell when it is adjacent.
 * Returns unchanged `state` (same reference) when the move is illegal.
 */
export function moveTile(state: SlidingPuzzleState, tileId: number): MoveSlidingTileResult {
  if (tileId === state.emptyTileId) {
    return { state, moved: false };
  }
  const pos = indexOfTile(state, tileId);
  if (pos < 0) {
    return { state, moved: false };
  }
  const { cols, rows } = state.grid;
  const neigh = neighborsOfIndex(state.emptyIndex, cols, rows);
  if (!neigh.includes(pos)) {
    return { state, moved: false };
  }

  const cells = swapCells(state.cells, pos, state.emptyIndex);
  const next: SlidingPuzzleState = {
    ...state,
    cells,
    emptyIndex: pos,
    moveCount: state.moveCount + 1,
  };
  return { state: next, moved: true };
}

/**
 * Same as `moveTile` but addresses the tile by its current linear cell index (row-major).
 */
export function moveTileAtIndex(state: SlidingPuzzleState, cellIndex: number): MoveSlidingTileResult {
  const tileId = state.cells[cellIndex];
  if (tileId === undefined) return { state, moved: false };
  return moveTile(state, tileId);
}

export function isSlidingPuzzleComplete(state: SlidingPuzzleState): boolean {
  return isSolvedCells(state.cells);
}
