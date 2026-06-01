import type {
  FragmentBackgroundStyle,
  FragmentPiece,
  FragmentSlot,
  FragmentTemplatePiece,
  NormalizedRectStyle,
  PuzzleGrid,
} from "./types";

function toPercentRect(
  rect: Pick<FragmentTemplatePiece, "x" | "y" | "w" | "h">,
  grid: PuzzleGrid,
): NormalizedRectStyle {
  return {
    leftPercent: (100 * rect.x) / grid.cols,
    topPercent: (100 * rect.y) / grid.rows,
    widthPercent: (100 * rect.w) / grid.cols,
    heightPercent: (100 * rect.h) / grid.rows,
  };
}

/**
 * Returns normalized geometry for rendering a slot region in CSS.
 */
export function getSlotStyle(slot: Pick<FragmentSlot, "x" | "y" | "w" | "h">, grid: PuzzleGrid): NormalizedRectStyle {
  return toPercentRect(slot, grid);
}

/**
 * Returns normalized geometry for rendering a piece region in CSS.
 */
export function getPieceStyle(piece: Pick<FragmentPiece, "x" | "y" | "w" | "h">, grid: PuzzleGrid): NormalizedRectStyle {
  return toPercentRect(piece, grid);
}

/**
 * Converts a fragment region to CSS background crop values.
 *
 * The returned values are compatible with:
 * - `background-size: {backgroundSize}`
 * - `background-position: {backgroundPosition}`
 */
export function getFragmentBackgroundStyle(
  piece: Pick<FragmentTemplatePiece, "x" | "y" | "w" | "h">,
  grid: PuzzleGrid,
): FragmentBackgroundStyle {
  const backgroundPositionXPercent = piece.w === grid.cols ? 50 : (100 * piece.x) / (grid.cols - piece.w);
  const backgroundPositionYPercent = piece.h === grid.rows ? 50 : (100 * piece.y) / (grid.rows - piece.h);
  const backgroundSizeWidthPercent = (100 * grid.cols) / piece.w;
  const backgroundSizeHeightPercent = (100 * grid.rows) / piece.h;

  return {
    backgroundPositionXPercent,
    backgroundPositionYPercent,
    backgroundSizeWidthPercent,
    backgroundSizeHeightPercent,
    backgroundPosition: `${backgroundPositionXPercent}% ${backgroundPositionYPercent}%`,
    backgroundSize: `${backgroundSizeWidthPercent}% ${backgroundSizeHeightPercent}%`,
  };
}
