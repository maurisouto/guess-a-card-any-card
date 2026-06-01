"use client";

import { FragmentsLogo } from "@/components/brand/fragments-logo";
import { SetMultiSelect } from "@/components/game/SetMultiSelect";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { PuzzleDifficulty, PuzzleMode } from "@/features/fragments/engine";
import { cn } from "@/lib/utils/cn";

const MODES: { id: PuzzleMode; title: string; body: string }[] = [
  {
    id: "fragments",
    title: "Fragment Puzzle",
    body: "Tap a piece, then a slot. Rebuild the card from shards of real Rathe art.",
  },
  {
    id: "sliding",
    title: "Sliding Puzzle",
    body: "Tap tiles beside the gap. Slide until the portrait is whole.",
  },
];

const DIFFICULTIES: { id: PuzzleDifficulty; label: string; hint: string }[] = [
  { id: "easy", label: "Easy", hint: "3×4 — forgiving pace" },
  { id: "normal", label: "Normal", hint: "4×5 — balanced" },
  { id: "hard", label: "Hard", hint: "5×6 — dense fragments" },
];

type FragmentsSetupPanelProps = {
  mode: PuzzleMode;
  difficulty: PuzzleDifficulty;
  fabSetOptions: string[];
  fabSetsLoading: boolean;
  selectedFabSets: Set<string>;
  onFabSetsChange: (next: Set<string>) => void;
  onModeChange: (mode: PuzzleMode) => void;
  onDifficultyChange: (difficulty: PuzzleDifficulty) => void;
  onStart: () => void | Promise<void>;
  startBusy?: boolean;
  startError?: string | null;
  className?: string;
};

export function FragmentsSetupPanel({
  mode,
  difficulty,
  fabSetOptions,
  fabSetsLoading,
  selectedFabSets,
  onFabSetsChange,
  onModeChange,
  onDifficultyChange,
  onStart,
  startBusy = false,
  startError = null,
  className,
}: FragmentsSetupPanelProps) {
  return (
    <div className={cn("flex flex-col gap-8", className)}>
      <section className="flex flex-col items-center gap-4 text-center sm:pt-2">
        <FragmentsLogo placement="hero" />
        <p className="max-w-2xl text-sm leading-relaxed text-[#a6d8bf] sm:text-base">
          Choose how you wish to restore the next card: real Flesh and Blood printings from the same catalog as Guess —
          calm, contemplative, and replayable.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => onModeChange(m.id)}
            className={cn(
              "rounded-xl border p-5 text-left transition-[border-color,box-shadow,transform] duration-200",
              "border-[#2f7f5f]/38 bg-[linear-gradient(165deg,rgba(15,31,26,0.86),rgba(11,18,16,0.82))] shadow-[0_2px_14px_rgba(0,0,0,0.22)]",
              "hover:-translate-y-0.5 hover:border-[#4ade80]/42",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86efac]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1210]",
              mode === m.id && "border-[#86efac]/55 ring-1 ring-[#4ade80]/22",
            )}
          >
            <h2 className="font-codex text-lg text-[#ddfeea]">{m.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#a4d3bc]">{m.body}</p>
          </button>
        ))}
      </section>

      <Panel
        variant="subtle"
        className="border-[#2f7f5f]/28 bg-[linear-gradient(170deg,rgba(15,31,26,0.72),rgba(11,18,16,0.8))] p-5"
      >
        <h3 className="font-codex text-base text-[#ddfeea]">Card pool</h3>
        <p className="mt-2 text-xs leading-relaxed text-[#8fbc9f]">
          Leave empty for all sets, or narrow to one or more releases. Signed-in restorations sync to your archive;
          guests play locally on this device.
        </p>
        <div className="mt-4">
          <SetMultiSelect
            tone="fragments"
            options={fabSetOptions}
            value={selectedFabSets}
            onChange={onFabSetsChange}
            loading={fabSetsLoading}
            loadingLabel="Gathering sets from the catalog…"
            emptyLabel="No sets from the catalog yet — try again shortly."
            allSetsSummary="All sets (full catalog)"
          />
        </div>
      </Panel>

      <Panel
        variant="subtle"
        className="border-[#2f7f5f]/28 bg-[linear-gradient(170deg,rgba(15,31,26,0.72),rgba(11,18,16,0.8))] p-5"
      >
        <h3 className="font-codex text-base text-[#ddfeea]">Difficulty</h3>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {DIFFICULTIES.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => onDifficultyChange(d.id)}
              className={cn(
                "rounded-lg border px-3 py-3 text-left transition-[border-color,background-color] duration-150",
                "border-[#2f7f5f]/45 bg-[#0b1210]/50",
                "hover:border-[#4ade80]/38",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#86efac]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1210]",
                difficulty === d.id && "border-[#86efac]/55 bg-[#0f1f1a]/65",
              )}
            >
              <p className="text-sm font-semibold text-[#ddfeea]">{d.label}</p>
              <p className="mt-1 text-xs text-[#8fbc9f]">{d.hint}</p>
            </button>
          ))}
        </div>
        {startError ? (
          <p
            className="mt-4 rounded-lg border border-[#b45309]/35 bg-[#1a1208]/45 px-3 py-2 text-sm text-[#fcd9a8]"
            role="alert"
          >
            {startError}
          </p>
        ) : null}
        <div className="mt-6 flex justify-center sm:justify-start">
          <Button
            type="button"
            size="lg"
            disabled={startBusy || fabSetsLoading}
            className="w-full border-[#4ade80]/45 bg-[linear-gradient(180deg,#2f7f5f_0%,#1f5a44_100%)] text-[#e9ffef] hover:border-[#86efac]/75 hover:shadow-[0_0_26px_rgba(74,222,128,0.18)] focus-visible:outline-[#86efac] disabled:opacity-60 sm:w-auto"
            onClick={() => void onStart()}
          >
            {startBusy ? "Drawing a card…" : "Start puzzle"}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
