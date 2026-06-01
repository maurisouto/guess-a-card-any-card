"use client";

import { useState } from "react";

import { getSlotStyle } from "@/features/fragments/engine";
import type { FragmentPuzzleState } from "@/features/fragments/engine";
import type { PlacementFlash } from "@/features/fragments/hooks/use-fragments-puzzle-game";
import { cn } from "@/lib/utils/cn";

import { FragmentPuzzlePiece } from "./fragment-puzzle-piece";

type FragmentPuzzleBoardProps = {
  state: FragmentPuzzleState;
  imageSrc: string;
  selectedPieceId: string | null;
  placementFlash: PlacementFlash | null;
  /** Puzzle is complete — hold for transition to result. */
  isCompleting?: boolean;
  onSelectPiece: (pieceId: string) => void;
  onPlaceOnSlot: (slotId: string) => void;
  className?: string;
};

export function FragmentPuzzleBoard({
  state,
  imageSrc,
  selectedPieceId,
  placementFlash,
  isCompleting,
  onSelectPiece,
  onPlaceOnSlot,
  className,
}: FragmentPuzzleBoardProps) {
  const { grid } = state;
  const { cols, rows } = grid;
  const [pressedSlotId, setPressedSlotId] = useState<string | null>(null);
  const targeting = Boolean(selectedPieceId) && !isCompleting;

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-[min(92vw,28rem)]",
        isCompleting && "motion-safe:animate-[fragments-board-resolve_0.85s_ease-out_forwards]",
        className,
      )}
      style={{ aspectRatio: `${cols} / ${rows}` }}
    >
      <div
        className="absolute inset-0 rounded-2xl bg-[#0b1210]/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_12px_40px_rgba(0,0,0,0.35)] ring-1 ring-[#2f7f5f]/28"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-[#0f1f1a]/55"
        aria-hidden
      />

      {state.slots.map((slot) => {
        const geo = getSlotStyle(slot, grid);
        const pieceOnSlot = state.pieces.find((p) => p.currentSlotId === slot.id);
        const left = `${geo.leftPercent}%`;
        const top = `${geo.topPercent}%`;
        const width = `${geo.widthPercent}%`;
        const height = `${geo.heightPercent}%`;
        const isFlashSlot = placementFlash?.slotId === slot.id;
        const isPressed = pressedSlotId === slot.id;

        return (
          <div
            key={slot.id}
            className="absolute"
            style={{ left, top, width, height, padding: "3px" }}
          >
            <div
              role="button"
              tabIndex={0}
              className={cn(
                "relative h-full w-full rounded-lg border border-dashed transition-[border-color,background-color,box-shadow,transform] duration-200 ease-out",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86efac]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1210]",
                pieceOnSlot
                  ? "border-[#2f7f5f]/20 bg-transparent"
                  : "border-[#3d8f6a]/28 bg-[#0f1f1a]/22",
                targeting &&
                  "border-[#5ecf8f]/38 bg-[#0f1f1a]/32 shadow-[0_0_0_1px_rgba(74,222,128,0.08)]",
                targeting &&
                  !pieceOnSlot &&
                  "shadow-[inset_0_0_16px_rgba(74,222,128,0.07)]",
                isPressed && targeting && "scale-[0.99] border-[#86efac]/55",
                isFlashSlot && "motion-safe:animate-[fragments-slot-glint_0.55s_ease-out]",
              )}
              onClick={() => onPlaceOnSlot(slot.id)}
              onPointerDown={() => setPressedSlotId(slot.id)}
              onPointerUp={() => setPressedSlotId(null)}
              onPointerLeave={() => setPressedSlotId(null)}
              onPointerCancel={() => setPressedSlotId(null)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onPlaceOnSlot(slot.id);
                }
              }}
              aria-label={
                pieceOnSlot
                  ? `Slot holding piece ${pieceOnSlot.id}${targeting ? " — choose to place attuned fragment" : ""}`
                  : `Empty slot${targeting ? " — place attuned fragment here" : ""}`
              }
            >
              {pieceOnSlot ? (
                <FragmentPuzzlePiece
                  piece={pieceOnSlot}
                  grid={grid}
                  imageSrc={imageSrc}
                  selected={selectedPieceId === pieceOnSlot.id}
                  placementSettle={
                    placementFlash?.pieceId === pieceOnSlot.id && placementFlash.slotId === slot.id
                  }
                  onPress={() => onSelectPiece(pieceOnSlot.id)}
                  interactive={selectedPieceId == null}
                />
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
