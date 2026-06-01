"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { PuzzleDifficulty, PuzzleMode } from "@/features/fragments/engine";
import { cn } from "@/lib/utils/cn";

const MODE_LABEL: Record<PuzzleMode, string> = {
  fragments: "Fragment Puzzle",
  sliding: "Sliding Puzzle",
};

const DIFF_LABEL: Record<PuzzleDifficulty, string> = {
  easy: "Easy",
  normal: "Normal",
  hard: "Hard",
};

type PuzzleResultPanelProps = {
  imageSrc: string;
  cardName?: string | null;
  fabSet?: string | null;
  rarity?: string | null;
  mode: PuzzleMode;
  difficulty: PuzzleDifficulty;
  moves: number;
  elapsedLabel: string;
  onPlayAgain: () => void;
  onBackToSetup: () => void;
  saveState?: "saving" | "saved" | "guest" | "error" | "idle";
  saveMessage?: string | null;
  onRetrySave?: () => void;
  className?: string;
};

export function PuzzleResultPanel({
  imageSrc,
  cardName,
  fabSet,
  rarity,
  mode,
  difficulty,
  moves,
  elapsedLabel,
  onPlayAgain,
  onBackToSetup,
  saveState = "idle",
  saveMessage = null,
  onRetrySave,
  className,
}: PuzzleResultPanelProps) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <Panel
      variant="subtle"
      className={cn(
        "border-[#2f7f5f]/40 bg-[linear-gradient(165deg,rgba(15,31,26,0.94),rgba(11,18,16,0.9))] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.4)] sm:p-10",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-8 transition-[opacity,transform] duration-700 ease-out sm:flex-row sm:items-center sm:gap-12",
          show ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        )}
      >
        <div className="relative mx-auto w-full max-w-[min(20rem,88vw)] shrink-0 sm:mx-0">
          <div
            className="pointer-events-none absolute -inset-3 rounded-3xl bg-[radial-gradient(ellipse_at_50%_40%,rgba(74,222,128,0.14),transparent_68%)] opacity-80 blur-2xl motion-safe:[animation:fragments-attuned-glow_4s_ease-in-out_infinite]"
            aria-hidden
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={cardName ? `${cardName} — restored` : "Completed puzzle — full card"}
            className={cn(
              "relative aspect-[5/7] w-full rounded-xl border border-[#3d8f6a]/45 object-cover shadow-[0_8px_32px_rgba(0,0,0,0.45)] ring-1 ring-inset ring-[#0f1f1a]/5",
              "motion-safe:animate-[card-reveal-rise_0.75s_ease-out_both]",
            )}
          />
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="font-codex text-xs uppercase tracking-[0.2em] text-[#86efac]/90">Restored</p>
          <h2 className="mt-2 font-codex text-[1.65rem] leading-tight text-[#eefcf4] sm:text-4xl">
            The sigil holds — the card is whole
          </h2>
          {cardName ? (
            <p className="mt-3 text-base font-medium leading-snug text-[#ddfeea] sm:text-lg">{cardName}</p>
          ) : null}
          {(fabSet || rarity) ? (
            <p className="mt-1 text-xs text-[#8fbc9f]">
              {[fabSet, rarity].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          <p className="mt-3 text-sm leading-relaxed text-[#a4d3bc]">
            {MODE_LABEL[mode]}
            <span className="text-[#5f8f75]" aria-hidden>
              {" "}
              ·{" "}
            </span>
            {DIFF_LABEL[difficulty]}
          </p>
          <dl className="mt-8 grid max-w-md gap-3 text-left text-[#b6e3cc] sm:mx-0 sm:grid-cols-2">
            <div className="rounded-xl border border-[#214537]/55 bg-[#0b1210]/55 px-4 py-3">
              <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[#6b9e82]">Moves</dt>
              <dd className="mt-1 font-mono text-xl tabular-nums text-[#e8fff1]">{moves}</dd>
            </div>
            <div className="rounded-xl border border-[#214537]/55 bg-[#0b1210]/55 px-4 py-3">
              <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[#6b9e82]">Time</dt>
              <dd className="mt-1 font-mono text-xl tabular-nums text-[#e8fff1]">{elapsedLabel}</dd>
            </div>
          </dl>
          {saveMessage ? (
            <div
              className={cn(
                "mt-5 rounded-lg border px-3 py-2 text-xs",
                saveState === "error"
                  ? "border-[#b45309]/35 bg-[#1a1208]/40 text-[#fcd9a8]"
                  : saveState === "saved"
                    ? "border-[#2f7f5f]/45 bg-[#0f1f1a]/55 text-[#c2f2d8]"
                    : "border-[#2f7f5f]/30 bg-[#0b1210]/45 text-[#9fc8b6]",
              )}
              role="status"
            >
              <div className="flex items-center justify-between gap-3">
                <span>{saveMessage}</span>
                {saveState === "error" && onRetrySave ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 border border-[#2f7f5f]/45 px-2 text-[0.7rem] text-[#cdeedc] hover:bg-[#0f1f1a]/70"
                    onClick={onRetrySave}
                  >
                    Retry save
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Button
              type="button"
              size="lg"
              className="w-full border-[#4ade80]/45 bg-[linear-gradient(180deg,#2f7f5f_0%,#1f5a44_100%)] text-[#e9ffef] hover:border-[#86efac]/75 focus-visible:outline-[#86efac] sm:min-w-[11rem]"
              onClick={onPlayAgain}
            >
              Play again
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="w-full border-[#2f7f5f]/55 bg-[#0b1210]/45 text-[#bde9cf] hover:border-[#4ade80]/45 focus-visible:outline-[#86efac] sm:min-w-[11rem]"
              onClick={onBackToSetup}
            >
              Back to setup
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}
