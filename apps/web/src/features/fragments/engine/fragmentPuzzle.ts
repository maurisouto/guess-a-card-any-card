import { shuffleWithSeed } from "./shuffle";
import { getFragmentBackgroundStyle } from "./fragmentGeometry";
import type {
  FragmentPiece,
  FragmentPuzzleState,
  FragmentSlot,
  FragmentTemplate,
} from "./types";

function slotIdForTemplatePiece(pieceId: string): string {
  return `slot-${pieceId}`;
}

export function buildFragmentPuzzle(template: FragmentTemplate, seed: string): FragmentPuzzleState {
  const pieceIds = template.pieces.map((p) => p.id);
  const trayOrder = shuffleWithSeed(pieceIds, `${seed}:fragments:tray`);

  const pieces: FragmentPiece[] = template.pieces.map((p) => {
    const sid = slotIdForTemplatePiece(p.id);
    const crop = getFragmentBackgroundStyle(p, template.grid);
    return {
      id: p.id,
      correctSlotId: sid,
      x: p.x,
      y: p.y,
      w: p.w,
      h: p.h,
      bgPositionXPercent: crop.backgroundPositionXPercent,
      bgPositionYPercent: crop.backgroundPositionYPercent,
      bgSizeWidthPercent: crop.backgroundSizeWidthPercent,
      bgSizeHeightPercent: crop.backgroundSizeHeightPercent,
      currentSlotId: null,
    };
  });

  const slots: FragmentSlot[] = template.pieces.map((p) => ({
    id: slotIdForTemplatePiece(p.id),
    x: p.x,
    y: p.y,
    w: p.w,
    h: p.h,
    currentPieceId: null,
  }));

  return {
    templateId: template.id,
    difficulty: template.difficulty,
    grid: { ...template.grid },
    pieces,
    slots,
    trayOrder,
    moveCount: 0,
  };
}

function findPiece(state: FragmentPuzzleState, pieceId: string): FragmentPiece | undefined {
  return state.pieces.find((p) => p.id === pieceId);
}

function findSlot(state: FragmentPuzzleState, slotId: string): FragmentSlot | undefined {
  return state.slots.find((s) => s.id === slotId);
}

function cloneState(base: FragmentPuzzleState, overrides: Partial<FragmentPuzzleState>): FragmentPuzzleState {
  return {
    ...base,
    ...overrides,
    grid: { ...base.grid },
    pieces: base.pieces.map((p) => ({ ...p })),
    slots: base.slots.map((s) => ({ ...s })),
    trayOrder: [...base.trayOrder],
  };
}

export type PlaceFragmentPieceResult = {
  state: FragmentPuzzleState;
  /** True when the board changed (placement, swap, or displacement to tray). */
  placed: boolean;
};

/**
 * Places `pieceId` onto `slotId`.
 * - Empty slot: piece moves from tray or from its previous slot.
 * - Occupied slot + piece from tray: displaced piece returns to the tray (appended).
 * - Occupied slot + piece from another slot: swap the two pieces.
 */
export function placeFragmentPiece(
  state: FragmentPuzzleState,
  pieceId: string,
  slotId: string,
): PlaceFragmentPieceResult {
  const piece = findPiece(state, pieceId);
  const slot = findSlot(state, slotId);
  if (!piece || !slot) {
    return { state, placed: false };
  }

  if (piece.currentSlotId === slotId) {
    return { state, placed: false };
  }

  const fromTray = piece.currentSlotId === null;
  const occupyingId = slot.currentPieceId;

  const next = cloneState(state, { moveCount: state.moveCount + 1 });

  const pieceRef = next.pieces.find((p) => p.id === pieceId)!;
  const slotRef = next.slots.find((s) => s.id === slotId)!;

  if (occupyingId == null) {
    if (!fromTray) {
      const prevSlotId = piece.currentSlotId!;
      const prevSlotRef = next.slots.find((s) => s.id === prevSlotId)!;
      prevSlotRef.currentPieceId = null;
    } else {
      next.trayOrder = next.trayOrder.filter((id) => id !== pieceId);
    }

    slotRef.currentPieceId = pieceId;
    pieceRef.currentSlotId = slotId;
    return { state: next, placed: true };
  }

  // Target slot occupied
  const other = next.pieces.find((p) => p.id === occupyingId)!;

  if (fromTray) {
    other.currentSlotId = null;
    next.trayOrder = [...next.trayOrder.filter((id) => id !== pieceId), occupyingId];

    slotRef.currentPieceId = pieceId;
    pieceRef.currentSlotId = slotId;
    return { state: next, placed: true };
  }

  // Swap two slotted pieces
  const prevSlotId = piece.currentSlotId!;
  const prevSlotRef = next.slots.find((s) => s.id === prevSlotId)!;

  prevSlotRef.currentPieceId = occupyingId;
  other.currentSlotId = prevSlotId;

  slotRef.currentPieceId = pieceId;
  pieceRef.currentSlotId = slotId;

  return { state: next, placed: true };
}

export function isFragmentPuzzleComplete(state: FragmentPuzzleState): boolean {
  return state.pieces.every((p) => p.currentSlotId !== null && p.currentSlotId === p.correctSlotId);
}
