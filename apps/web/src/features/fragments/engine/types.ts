export type PuzzleDifficulty = "easy" | "normal" | "hard";

export type PuzzleMode = "fragments" | "sliding";

export type PuzzleGrid = {
  cols: number;
  rows: number;
};

export type FragmentTemplatePiece = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

export type FragmentTemplate = {
  id: string;
  difficulty: PuzzleDifficulty;
  grid: PuzzleGrid;
  pieces: FragmentTemplatePiece[];
};

export type NormalizedRectStyle = {
  leftPercent: number;
  topPercent: number;
  widthPercent: number;
  heightPercent: number;
};

/**
 * One draggable fragment. Geometry (x,y,w,h) is in grid cells (top-left origin).
 * Background fields match the common CSS pattern:
 * `background-size: ${bgSizeWidthPercent}% ${bgSizeHeightPercent}%`
 * `background-position: ${bgPositionXPercent}% ${bgPositionYPercent}%`
 * (with appropriate edge cases at the UI layer when w === cols or h === rows).
 */
export type FragmentPiece = {
  id: string;
  correctSlotId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  bgPositionXPercent: number;
  bgPositionYPercent: number;
  bgSizeWidthPercent: number;
  bgSizeHeightPercent: number;
  /** `null` when the piece is in the tray. */
  currentSlotId: string | null;
};

export type FragmentBackgroundStyle = {
  backgroundPosition: string;
  backgroundSize: string;
  backgroundPositionXPercent: number;
  backgroundPositionYPercent: number;
  backgroundSizeWidthPercent: number;
  backgroundSizeHeightPercent: number;
};

export type FragmentSlot = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  currentPieceId: string | null;
};

export type FragmentPuzzleState = {
  templateId: string;
  difficulty: PuzzleDifficulty;
  grid: PuzzleGrid;
  pieces: FragmentPiece[];
  slots: FragmentSlot[];
  /** Piece ids currently in the tray, in display order (unplaced only). */
  trayOrder: string[];
  moveCount: number;
};

export type SlidingPuzzleState = {
  difficulty: PuzzleDifficulty;
  grid: PuzzleGrid;
  /** Row-major cell contents: id of the tile occupying each cell (0 .. n-1). */
  cells: number[];
  /** Id of the empty tile (always `cols * rows - 1` in v1). */
  emptyTileId: number;
  /** Linear index (row-major) of the empty cell. */
  emptyIndex: number;
  /** Target layout: `solvedCells[i] === i`. */
  solvedCells: number[];
  moveCount: number;
};
