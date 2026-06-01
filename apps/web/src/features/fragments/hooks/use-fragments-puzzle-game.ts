"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { MOCK_CARD_IMAGE_SRC } from "@/features/fragments/constants";
import {
  buildFragmentPuzzle,
  buildSlidingPuzzle,
  canMoveTile,
  getRandomFragmentTemplate,
  isFragmentPuzzleComplete,
  isSlidingPuzzleComplete,
  moveTile,
  placeFragmentPiece,
} from "@/features/fragments/engine";
import type {
  FragmentPuzzleState,
  PuzzleDifficulty,
  PuzzleMode,
  SlidingPuzzleState,
} from "@/features/fragments/engine";
import type { FragmentsSessionCard } from "@/features/fragments/lib/fragments-catalog";
import { pickFragmentsPlayableCard } from "@/features/fragments/lib/fragments-catalog";
import { useCatalogFabSets } from "@/hooks/use-catalog-fab-sets";
import { useAuth } from "@/components/auth/auth-context";
import { postFragmentsCompletion } from "@/lib/fragments/fragments-api";

export type PuzzlePhase = "setup" | "playing" | "resolving" | "completed";

export type PlacementFlash = { slotId: string; pieceId: string };

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

const RESOLVE_MS = 880;

export function useFragmentsPuzzleGame() {
  const { sets: fabSets, setsLoading: fabSetsLoading } = useCatalogFabSets();
  const { user } = useAuth();
  const [phase, setPhase] = useState<PuzzlePhase>("setup");
  const [mode, setMode] = useState<PuzzleMode>("fragments");
  const [difficulty, setDifficulty] = useState<PuzzleDifficulty>("easy");
  const [selectedFabSets, setSelectedFabSets] = useState<Set<string>>(() => new Set());

  const [sessionCard, setSessionCard] = useState<FragmentsSessionCard | null>(null);
  const [boardImageSrcOverride, setBoardImageSrcOverride] = useState<string | null>(null);
  const [startBusy, setStartBusy] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeSeed, setActiveSeed] = useState<string | null>(null);
  const [completionSaveState, setCompletionSaveState] = useState<
    "idle" | "saving" | "saved" | "guest" | "error"
  >("idle");
  const [completionSaveMessage, setCompletionSaveMessage] = useState<string | null>(null);

  const [fragmentState, setFragmentState] = useState<FragmentPuzzleState | null>(null);
  const [slidingState, setSlidingState] = useState<SlidingPuzzleState | null>(null);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);

  const [elapsedMs, setElapsedMs] = useState(0);
  const [finalStats, setFinalStats] = useState<{ moves: number; ms: number } | null>(null);
  const [resolvingSnapshot, setResolvingSnapshot] = useState<{ moves: number; ms: number } | null>(null);
  const [placementFlash, setPlacementFlash] = useState<PlacementFlash | null>(null);

  const [sessionRoot] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "frag-local-prototype",
  );
  const runIdRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const completionHandledRef = useRef(false);

  const stopTimer = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    startedAtRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    const start = performance.now();
    startedAtRef.current = start;
    const tick = () => {
      if (startedAtRef.current == null) return;
      setElapsedMs(performance.now() - startedAtRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [stopTimer]);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  useEffect(() => {
    if (!placementFlash) return;
    const t = window.setTimeout(() => setPlacementFlash(null), 440);
    return () => window.clearTimeout(t);
  }, [placementFlash]);

  const goToSetup = useCallback(() => {
    stopTimer();
    completionHandledRef.current = false;
    setPhase("setup");
    setFragmentState(null);
    setSlidingState(null);
    setActiveTemplateId(null);
    setSelectedPieceId(null);
    setElapsedMs(0);
    setFinalStats(null);
    setResolvingSnapshot(null);
    setPlacementFlash(null);
    setSessionCard(null);
    setBoardImageSrcOverride(null);
    setStartError(null);
    setActiveRunId(null);
    setActiveSeed(null);
    setCompletionSaveState("idle");
    setCompletionSaveMessage(null);
  }, [stopTimer]);

  const reportBoardArtFailed = useCallback(() => {
    setBoardImageSrcOverride(MOCK_CARD_IMAGE_SRC);
  }, []);

  const startGame = useCallback(async () => {
    setStartBusy(true);
    setStartError(null);
    runIdRef.current += 1;
    completionHandledRef.current = false;
    const runSeed = `${sessionRoot}:run-${runIdRef.current}`;
    const runId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${runSeed}:fallback-run-id`;
    const selected = [...selectedFabSets].map((s) => s.trim()).filter((s) => s.length > 0);

    try {
      const pick = await pickFragmentsPlayableCard({
        selectedFabSets: selected,
        seed: runSeed,
      });

      if (!pick.ok) {
        setStartError(pick.friendly);
        return;
      }

      setSessionCard(pick.card);
      setBoardImageSrcOverride(null);
      setActiveRunId(runId);
      setActiveSeed(runSeed);
      setCompletionSaveState("idle");
      setCompletionSaveMessage(null);
      setFinalStats(null);
      setResolvingSnapshot(null);
      setSelectedPieceId(null);
      setPlacementFlash(null);
      setElapsedMs(0);

      if (mode === "fragments") {
        const template = getRandomFragmentTemplate(difficulty, runSeed);
        if (!template) {
          setStartError("Could not build a fragment layout for this difficulty.");
          return;
        }
        setActiveTemplateId(template.id);
        setFragmentState(buildFragmentPuzzle(template, runSeed));
        setSlidingState(null);
      } else {
        setActiveTemplateId(null);
        setFragmentState(null);
        setSlidingState(buildSlidingPuzzle(difficulty, runSeed));
      }

      setPhase("playing");
      startTimer();
    } finally {
      setStartBusy(false);
    }
  }, [difficulty, mode, selectedFabSets, sessionRoot, startTimer]);

  const boardImageSrc =
    boardImageSrcOverride ??
    (sessionCard?.imageUrl && sessionCard.imageUrl.length > 0 ? sessionCard.imageUrl : MOCK_CARD_IMAGE_SRC);

  const playAgain = useCallback(() => {
    void startGame();
  }, [startGame]);

  useEffect(() => {
    if (phase !== "playing") return;
    if (completionHandledRef.current) return;

    if (mode === "fragments" && fragmentState && isFragmentPuzzleComplete(fragmentState)) {
      completionHandledRef.current = true;
      if (startedAtRef.current == null) return;
      const ms = performance.now() - startedAtRef.current;
      stopTimer();
      setResolvingSnapshot({ moves: fragmentState.moveCount, ms });
      setElapsedMs(ms);
      setSelectedPieceId(null);
      setPhase("resolving");
      return;
    }

    if (mode === "sliding" && slidingState && isSlidingPuzzleComplete(slidingState)) {
      completionHandledRef.current = true;
      if (startedAtRef.current == null) return;
      const ms = performance.now() - startedAtRef.current;
      stopTimer();
      setResolvingSnapshot({ moves: slidingState.moveCount, ms });
      setElapsedMs(ms);
      setPhase("resolving");
    }
  }, [phase, mode, fragmentState, slidingState, stopTimer]);

  useEffect(() => {
    if (phase !== "resolving" || !resolvingSnapshot) return;
    const t = window.setTimeout(() => {
      setFinalStats({ moves: resolvingSnapshot.moves, ms: resolvingSnapshot.ms });
      setPhase("completed");
    }, RESOLVE_MS);
    return () => window.clearTimeout(t);
  }, [phase, resolvingSnapshot]);

  const submitCompletion = useCallback(async () => {
    if (!finalStats || !sessionCard || !activeRunId || !activeSeed) return;
    if (!user) {
      setCompletionSaveState("guest");
      setCompletionSaveMessage("Sign in to preserve your restorations in the archive.");
      return;
    }
    setCompletionSaveState("saving");
    setCompletionSaveMessage("Saving to your Fragments profile…");
    try {
      const result = await postFragmentsCompletion({
        runId: activeRunId,
        cardId: sessionCard.cardId,
        cardName: sessionCard.cardName,
        cardImageUrl: sessionCard.imageUrl,
        fabSet: sessionCard.fabSet,
        rarity: sessionCard.rarity,
        puzzleMode: mode,
        difficulty,
        timeMs: Math.floor(finalStats.ms),
        moves: finalStats.moves,
        seed: activeSeed,
        templateId: mode === "fragments" ? activeTemplateId ?? null : null,
      });
      if (result.persisted) {
        setCompletionSaveState("saved");
        setCompletionSaveMessage("Saved to your Fragments profile.");
      } else {
        setCompletionSaveState("guest");
        setCompletionSaveMessage("Sign in to preserve your restorations in the archive.");
      }
    } catch {
      setCompletionSaveState("error");
      setCompletionSaveMessage("Could not save this run. You can retry.");
    }
  }, [activeRunId, activeSeed, activeTemplateId, difficulty, finalStats, mode, sessionCard, user]);

  useEffect(() => {
    if (phase !== "completed" || !finalStats) return;
    if (completionSaveState !== "idle") return;
    void submitCompletion();
  }, [completionSaveState, finalStats, phase, submitCompletion]);

  const togglePieceSelection = useCallback((pieceId: string) => {
    if (phase !== "playing") return;
    setSelectedPieceId((prev) => (prev === pieceId ? null : pieceId));
  }, [phase]);

  const onFragmentSlotClick = useCallback(
    (slotId: string) => {
      if (phase !== "playing" || !fragmentState || !selectedPieceId) return;
      const { state, placed } = placeFragmentPiece(fragmentState, selectedPieceId, slotId);
      if (placed) {
        setFragmentState(state);
        setPlacementFlash({ slotId, pieceId: selectedPieceId });
      }
    },
    [fragmentState, phase, selectedPieceId],
  );

  const onSlidingTileClick = useCallback(
    (tileId: number) => {
      if (phase !== "playing" || !slidingState) return;
      if (!canMoveTile(slidingState, tileId)) return;
      const { state, moved } = moveTile(slidingState, tileId);
      if (moved) {
        setSlidingState(state);
      }
    },
    [phase, slidingState],
  );

  const movesLive =
    mode === "fragments" ? (fragmentState?.moveCount ?? 0) : (slidingState?.moveCount ?? 0);
  const moves =
    phase === "resolving" && resolvingSnapshot ? resolvingSnapshot.moves : movesLive;

  const elapsedForLabel =
    phase === "completed" && finalStats
      ? finalStats.ms
      : phase === "resolving" && resolvingSnapshot
        ? resolvingSnapshot.ms
        : elapsedMs;

  return {
    phase,
    mode,
    difficulty,
    setMode,
    setDifficulty,
    fabSets,
    fabSetsLoading,
    selectedFabSets,
    setSelectedFabSets,
    sessionCard,
    boardImageSrc,
    reportBoardArtFailed,
    startBusy,
    startError,
    completionSaveState,
    completionSaveMessage,
    fragmentState,
    slidingState,
    activeTemplateId,
    selectedPieceId,
    togglePieceSelection,
    onFragmentSlotClick,
    onSlidingTileClick,
    startGame,
    goToSetup,
    playAgain,
    elapsedMs,
    elapsedLabel: formatElapsed(elapsedForLabel),
    moves,
    finalStats,
    placementFlash,
    resolvingSnapshot,
    retryCompletionSubmit: submitCompletion,
  };
}
