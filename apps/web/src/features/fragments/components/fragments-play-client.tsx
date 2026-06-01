"use client";

import { useFragmentsPuzzleGame } from "@/features/fragments/hooks/use-fragments-puzzle-game";
import { cn } from "@/lib/utils/cn";

import { FragmentsCardArtGate } from "./fragments-card-art-gate";
import { FragmentsPuzzleEntryRail } from "./fragments-puzzle-entry-rail";
import { FragmentPieceTray } from "./fragment-piece-tray";
import { FragmentPuzzleBoard } from "./fragment-puzzle-board";
import { FragmentsGameShell } from "./fragments-game-shell";
import { FragmentsHud } from "./fragments-hud";
import { FragmentsSetupPanel } from "./fragments-setup-panel";
import { PuzzleResultPanel } from "./puzzle-result-panel";
import { SlidingPuzzleBoard } from "./sliding-puzzle-board";

export function FragmentsPlayClient() {
  const game = useFragmentsPuzzleGame();
  const isResolving = game.phase === "resolving";

  if (game.phase === "setup") {
    return (
      <div className="flex flex-col gap-8">
        <FragmentsPuzzleEntryRail />
        <FragmentsSetupPanel
          mode={game.mode}
          difficulty={game.difficulty}
          fabSetOptions={game.fabSets}
          fabSetsLoading={game.fabSetsLoading}
          selectedFabSets={game.selectedFabSets}
          onFabSetsChange={game.setSelectedFabSets}
          onModeChange={game.setMode}
          onDifficultyChange={game.setDifficulty}
          onStart={game.startGame}
          startBusy={game.startBusy}
          startError={game.startError}
        />
      </div>
    );
  }

  if (game.phase === "completed" && game.finalStats) {
    return (
      <PuzzleResultPanel
        imageSrc={game.boardImageSrc}
        cardName={game.sessionCard?.cardName}
        fabSet={game.sessionCard?.fabSet}
        rarity={game.sessionCard?.rarity}
        mode={game.mode}
        difficulty={game.difficulty}
        moves={game.finalStats.moves}
        elapsedLabel={game.elapsedLabel}
        onPlayAgain={() => void game.playAgain()}
        onBackToSetup={game.goToSetup}
        saveState={game.completionSaveState}
        saveMessage={game.completionSaveMessage}
        onRetrySave={() => void game.retryCompletionSubmit()}
      />
    );
  }

  return (
    <FragmentsGameShell>
      <FragmentsHud
        phase={game.phase}
        mode={game.mode}
        difficulty={game.difficulty}
        templateId={game.activeTemplateId}
        fabSet={game.sessionCard?.fabSet}
        rarity={game.sessionCard?.rarity}
        moves={game.moves}
        elapsedLabel={game.elapsedLabel}
        onBackToSetup={game.goToSetup}
      />

      <FragmentsCardArtGate
        key={game.boardImageSrc}
        imageSrc={game.boardImageSrc}
        onFallback={game.reportBoardArtFailed}
      >
        {game.mode === "fragments" && game.fragmentState ? (
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
            <div className="min-w-0 flex-1">
              <FragmentPuzzleBoard
                state={game.fragmentState}
                imageSrc={game.boardImageSrc}
                selectedPieceId={game.selectedPieceId}
                placementFlash={game.placementFlash}
                isCompleting={isResolving}
                onSelectPiece={game.togglePieceSelection}
                onPlaceOnSlot={game.onFragmentSlotClick}
              />
            </div>
            <div
              className={cn(
                "w-full shrink-0 lg:max-w-[min(100%,24rem)]",
                isResolving && "pointer-events-none opacity-85 transition-opacity duration-500",
              )}
            >
              <FragmentPieceTray
                state={game.fragmentState}
                imageSrc={game.boardImageSrc}
                selectedPieceId={game.selectedPieceId}
                onSelectPiece={game.togglePieceSelection}
              />
            </div>
          </div>
        ) : null}

        {game.mode === "sliding" && game.slidingState ? (
          <div
            className={cn(
              "flex flex-col gap-3",
              isResolving &&
                "pointer-events-none motion-safe:animate-[fragments-board-resolve_0.85s_ease-out_forwards]",
            )}
          >
            <p className="text-center text-xs leading-relaxed text-[#8fbc9f] sm:text-left">
              Tap a tile beside the empty space. Movement follows the engine — no drag, no shortcuts.
            </p>
            <SlidingPuzzleBoard
              state={game.slidingState}
              imageSrc={game.boardImageSrc}
              onTilePress={game.onSlidingTileClick}
            />
          </div>
        ) : null}
      </FragmentsCardArtGate>
    </FragmentsGameShell>
  );
}
