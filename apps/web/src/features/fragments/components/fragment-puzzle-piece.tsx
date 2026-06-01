"use client";

import { getFragmentBackgroundStyle } from "@/features/fragments/engine";
import type { FragmentPiece, PuzzleGrid } from "@/features/fragments/engine";
import { cn } from "@/lib/utils/cn";

type FragmentPuzzlePieceProps = {
  piece: FragmentPiece;
  grid: PuzzleGrid;
  imageSrc: string;
  selected?: boolean;
  /** Brief settle animation after a successful placement. */
  placementSettle?: boolean;
  onPress?: () => void;
  /** When true, clicks select this piece; when false, clicks pass through (for board + active placement). */
  interactive?: boolean;
  className?: string;
};

export function FragmentPuzzlePiece({
  piece,
  grid,
  imageSrc,
  selected,
  placementSettle,
  onPress,
  interactive = true,
  className,
}: FragmentPuzzlePieceProps) {
  const crop = getFragmentBackgroundStyle(piece, grid);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onPress?.();
      }}
      className={cn(
        "relative z-0 block h-full w-full overflow-hidden rounded-md border transition-[box-shadow,transform,border-color,filter] duration-200 ease-out",
        "border-[#2a6b52]/50 bg-[#0b1210]/40 shadow-[0_3px_14px_rgba(0,0,0,0.42)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86efac]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1210]",
        selected && [
          "z-[1] scale-[1.04] border-[#86efac]/85",
          "shadow-[0_0_0_2px_rgba(134,239,172,0.35),0_0_22px_rgba(74,222,128,0.2),0_6px_20px_rgba(0,0,0,0.45)]",
          "brightness-[1.07]",
        ],
        placementSettle && "motion-safe:animate-[fragments-place-settle_0.42s_ease-out]",
        interactive ? "cursor-pointer active:scale-[0.985]" : "pointer-events-none cursor-default",
        className,
      )}
      style={{
        backgroundImage: `url(${JSON.stringify(imageSrc)})`,
        backgroundRepeat: "no-repeat",
        backgroundSize: crop.backgroundSize,
        backgroundPosition: crop.backgroundPosition,
      }}
      aria-pressed={selected}
    >
      {selected ? (
        <span
          className="pointer-events-none absolute inset-0 rounded-md motion-safe:animate-[fragments-attuned-glow_3.2s_ease-in-out_infinite]"
          style={{
            background:
              "radial-gradient(ellipse at 50% 35%, rgba(134,239,172,0.14) 0%, transparent 62%)",
          }}
          aria-hidden
        />
      ) : null}
      <span
        className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-[#0f1f1a]/50"
        aria-hidden
      />
      <span className="sr-only">
        {selected ? "Attuned — " : ""}
        {`Fragment ${piece.id}`}
      </span>
    </button>
  );
}
