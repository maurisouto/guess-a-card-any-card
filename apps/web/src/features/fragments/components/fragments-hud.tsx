"use client";

import type { PuzzleDifficulty, PuzzleMode } from "@/features/fragments/engine";
import type { PuzzlePhase } from "@/features/fragments/hooks/use-fragments-puzzle-game";
import { cn } from "@/lib/utils/cn";

import { Button } from "@/components/ui/button";

const MODE_LABEL: Record<PuzzleMode, string> = {
  fragments: "Fragment Puzzle",
  sliding: "Sliding Puzzle",
};

const DIFF_LABEL: Record<PuzzleDifficulty, string> = {
  easy: "Easy",
  normal: "Normal",
  hard: "Hard",
};

type FragmentsHudProps = {
  phase: PuzzlePhase;
  mode: PuzzleMode;
  difficulty: PuzzleDifficulty;
  templateId?: string | null;
  fabSet?: string | null;
  rarity?: string | null;
  moves: number;
  elapsedLabel: string;
  onBackToSetup: () => void;
  className?: string;
};

export function FragmentsHud({
  phase,
  mode,
  difficulty,
  templateId,
  fabSet,
  rarity,
  moves,
  elapsedLabel,
  onBackToSetup,
  className,
}: FragmentsHudProps) {
  const status =
    phase === "resolving"
      ? { kicker: "Completing", hint: "The image steadies…" }
      : { kicker: "In play", hint: null };

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-xl border border-[#2f7f5f]/32 bg-[linear-gradient(165deg,rgba(15,31,26,0.9),rgba(11,18,16,0.84))] p-4 shadow-[0_4px_24px_rgba(0,0,0,0.22)] sm:flex-row sm:items-center sm:justify-between sm:gap-6",
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="font-codex text-[0.68rem] uppercase tracking-[0.18em] text-[#86efac]/90">{status.kicker}</p>
          {status.hint ? (
            <span className="text-[0.65rem] font-normal normal-case tracking-normal text-[#7aab92]">
              {status.hint}
            </span>
          ) : null}
        </div>
        <p className="text-sm leading-snug text-[#ddfeea]">
          <span className="font-medium">{MODE_LABEL[mode]}</span>
          <span className="text-[#5f8f75]" aria-hidden>
            {" "}
            ·{" "}
          </span>
          <span className="text-[#bde9cf]">{DIFF_LABEL[difficulty]}</span>
          {mode === "fragments" && templateId ? (
            <>
              <span className="text-[#5f8f75]" aria-hidden>
                {" "}
                ·{" "}
              </span>
              <span className="text-[#8ebda8]">{templateId}</span>
            </>
          ) : null}
        </p>
        {fabSet || rarity ? (
          <p className="text-[0.72rem] text-[#7aab92]">
            {[fabSet, rarity].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#214537]/55 pt-2 text-[0.8rem] text-[#9fc8b6]">
          <div className="flex items-baseline gap-2">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#6b9e82]">
              Moves
            </span>
            <span className="font-mono text-base tabular-nums tracking-tight text-[#e8fff1]">{moves}</span>
          </div>
          <span className="hidden h-4 w-px bg-[#2f7f5f]/45 sm:block" aria-hidden />
          <div className="flex items-baseline gap-2">
            <span className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#6b9e82]">
              Time
            </span>
            <span className="font-mono text-base tabular-nums tracking-tight text-[#e8fff1]">{elapsedLabel}</span>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 justify-end sm:pl-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-[#2f7f5f]/55 bg-[#0b1210]/55 text-[#bde9cf] hover:border-[#4ade80]/45 hover:bg-[#0f1f1a]/75 focus-visible:outline-[#86efac]"
          onClick={onBackToSetup}
        >
          Back to setup
        </Button>
      </div>
    </div>
  );
}
