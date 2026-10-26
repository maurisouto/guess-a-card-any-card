"use client";

import type { FragmentPuzzleState } from "@/features/fragments/engine";
import { cn } from "@/lib/utils/cn";

import { FragmentPuzzlePiece } from "./fragment-puzzle-piece";

type FragmentPieceTrayProps = {
  state: FragmentPuzzleState;
  imageSrc: string;
  selectedPieceId: string | null;
  onSelectPiece: (pieceId: string) => void;
  className?: string;
};

export function FragmentPieceTray({
  state,
  imageSrc,
  selectedPieceId,
  onSelectPiece,
  className,
}: FragmentPieceTrayProps) {
  const byId = new Map(state.pieces.map((p) => [p.id, p]));
  const trayPieces = state.trayOrder
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof p> => p != null);

  return (
    <div className={cn("w-full", className)}>
      <p className="mb-2 text-center text-[0.7rem] font-medium uppercase tracking-[0.14em] text-[#7fb89a] sm:text-left">
        Tray
        <span className="mx-1.5 hidden text-[#4f8068] sm:inline">·</span>
        <span className="block text-[0.65rem] font-normal normal-case tracking-normal text-[#8fbc9f] sm:inline">
          Tap a fragment to attune, then a slot on the board
        </span>
      </p>

      <div className="relative -mx-1 sm:mx-0">
        <div
          className={cn(
            "flex gap-3 overflow-x-auto overflow-y-visible py-1 pl-1 pr-4 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:px-0 sm:pr-0",
            "[&::-webkit-scrollbar]:hidden",
          )}
        >
          {trayPieces.map((piece) => (
            <div
              key={piece.id}
              className={cn(
                "w-[4.75rem] shrink-0 sm:w-[min(30vw,6.5rem)]",
                piece.h > piece.w ? "max-h-[min(40vw,8.5rem)] sm:max-h-none" : "",
              )}
              style={{ aspectRatio: `${piece.w} / ${piece.h}` }}
            >
              <FragmentPuzzlePiece
                piece={piece}
                grid={state.grid}
                imageSrc={imageSrc}
                selected={selectedPieceId === piece.id}
                onPress={() => onSelectPiece(piece.id)}
                interactive
              />
            </div>
          ))}
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[#0b1210] via-[#0b1210]/80 to-transparent sm:hidden"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-[#0b1210]/90 to-transparent sm:hidden"
          aria-hidden
        />
      </div>
    </div>
  );
}
