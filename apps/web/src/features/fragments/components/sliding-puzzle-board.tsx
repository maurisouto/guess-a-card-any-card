"use client";

import { useEffect, useState } from "react";

import { getFragmentBackgroundStyle } from "@/features/fragments/engine";
import type { SlidingPuzzleState } from "@/features/fragments/engine";
import { cn } from "@/lib/utils/cn";

type SlidingPuzzleBoardProps = {
  state: SlidingPuzzleState;
  imageSrc: string;
  onTilePress: (tileId: number) => void;
  className?: string;
};

export function SlidingPuzzleBoard({ state, imageSrc, onTilePress, className }: SlidingPuzzleBoardProps) {
  const { cols, rows } = state.grid;
  const [pressedCell, setPressedCell] = useState<number | null>(null);

  useEffect(() => {
    if (pressedCell == null) return;
    const t = window.setTimeout(() => setPressedCell(null), 180);
    return () => window.clearTimeout(t);
  }, [pressedCell]);

  return (
    <div
      className={cn(
        "relative mx-auto grid w-full max-w-[min(92vw,28rem)] gap-1.5 rounded-xl bg-[#0b1210]/35 p-1.5 ring-1 ring-[#2f7f5f]/22",
        className,
      )}
      style={{
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
        aspectRatio: `${cols} / ${rows}`,
      }}
    >
      {state.cells.map((tileId, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        const isEmpty = tileId === state.emptyTileId;
        const solvedCol = tileId % cols;
        const solvedRow = Math.floor(tileId / cols);
        const rect = { x: solvedCol, y: solvedRow, w: 1, h: 1, id: `t-${tileId}` };
        const crop = getFragmentBackgroundStyle(rect, state.grid);
        const isPressed = pressedCell === index;

        return (
          <button
            key={`cell-${index}-${tileId}`}
            type="button"
            className={cn(
              "relative overflow-hidden rounded-md border text-left transition-[transform,filter,box-shadow,border-color] duration-200 ease-out",
              isEmpty
                ? "cursor-default border-[#1a3d30]/65 bg-[radial-gradient(ellipse_at_50%_40%,rgba(15,31,26,0.9),#0b1210)] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                : cn(
                    "border-[#316b52]/48 bg-[#0f1f1a]/5",
                    "hover:border-[#4ade80]/38 hover:brightness-[1.03]",
                    "active:scale-[0.97] active:brightness-[1.05]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86efac]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1210]",
                    isPressed && "scale-[0.96] brightness-[1.06]",
                  ),
            )}
            style={
              isEmpty
                ? undefined
                : {
                    backgroundImage: `url(${JSON.stringify(imageSrc)})`,
                    backgroundRepeat: "no-repeat",
                    backgroundSize: crop.backgroundSize,
                    backgroundPosition: crop.backgroundPosition,
                  }
            }
            onPointerDown={() => {
              if (!isEmpty) setPressedCell(index);
            }}
            onClick={() => {
              if (!isEmpty) onTilePress(tileId);
            }}
            disabled={isEmpty}
            aria-label={isEmpty ? "Empty tile" : `Tile ${tileId}`}
          >
            {!isEmpty ? (
              <span
                className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-[#0f1f1a]/45"
                aria-hidden
              />
            ) : (
              <span
                className="pointer-events-none absolute inset-[16%] rounded-md border border-dashed border-[#3d6b55]/35 opacity-80"
                aria-hidden
              />
            )}
            <span className="sr-only">{`Cell ${col},${row} — ${isEmpty ? "empty" : `tile ${tileId}`}`}</span>
          </button>
        );
      })}
    </div>
  );
}
