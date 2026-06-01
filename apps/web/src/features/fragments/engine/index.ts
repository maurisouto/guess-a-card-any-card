export { getPuzzleGridForDifficulty, PUZZLE_GRIDS } from "./difficulty";
export {
  assertValidFragmentTemplate,
  FRAGMENT_TEMPLATES,
  getFragmentTemplateById,
  getRandomFragmentTemplate,
  getTemplatesForDifficulty,
  validateFragmentTemplate,
} from "./fragmentTemplates";
export type { TemplateValidationIssue } from "./fragmentTemplates";
export { getFragmentBackgroundStyle, getPieceStyle, getSlotStyle } from "./fragmentGeometry";
export {
  buildFragmentPuzzle,
  isFragmentPuzzleComplete,
  placeFragmentPiece,
} from "./fragmentPuzzle";
export type { PlaceFragmentPieceResult } from "./fragmentPuzzle";
export { shuffleWithSeed } from "./shuffle";
export {
  buildSlidingPuzzle,
  canMoveTile,
  isSlidingConfigurationSolvable,
  isSlidingPuzzleComplete,
  moveTile,
  moveTileAtIndex,
  slidingPuzzleInversionCount,
} from "./slidingPuzzle";
export type { MoveSlidingTileResult } from "./slidingPuzzle";
export type {
  FragmentBackgroundStyle,
  FragmentPiece,
  FragmentPuzzleState,
  FragmentSlot,
  FragmentTemplate,
  FragmentTemplatePiece,
  NormalizedRectStyle,
  PuzzleDifficulty,
  PuzzleGrid,
  PuzzleMode,
  SlidingPuzzleState,
} from "./types";
