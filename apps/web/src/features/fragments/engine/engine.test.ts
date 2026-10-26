import { describe, expect, it } from "vitest";

import { getPuzzleGridForDifficulty, PUZZLE_GRIDS } from "./difficulty";
import {
  FRAGMENT_TEMPLATES,
  getTemplatesForDifficulty,
  getRandomFragmentTemplate,
  validateFragmentTemplate,
} from "./fragmentTemplates";
import { getFragmentBackgroundStyle, getPieceStyle, getSlotStyle } from "./fragmentGeometry";
import { buildFragmentPuzzle, isFragmentPuzzleComplete, placeFragmentPiece } from "./fragmentPuzzle";
import { shuffleWithSeed } from "./shuffle";
import {
  buildSlidingPuzzle,
  canMoveTile,
  isSlidingConfigurationSolvable,
  isSlidingPuzzleComplete,
  moveTile,
  moveTileAtIndex,
  slidingPuzzleInversionCount,
} from "./slidingPuzzle";

describe("difficulty", () => {
  it("maps easy/normal/hard to portrait grids", () => {
    expect(PUZZLE_GRIDS.easy).toEqual({ cols: 3, rows: 4 });
    expect(PUZZLE_GRIDS.normal).toEqual({ cols: 4, rows: 5 });
    expect(PUZZLE_GRIDS.hard).toEqual({ cols: 5, rows: 6 });
    expect(getPuzzleGridForDifficulty("easy")).toEqual({ cols: 3, rows: 4 });
    expect(getPuzzleGridForDifficulty("normal")).toEqual({ cols: 4, rows: 5 });
    expect(getPuzzleGridForDifficulty("hard")).toEqual({ cols: 5, rows: 6 });
  });
});

describe("fragment templates", () => {
  it("each template validates (full cover, no overlap, in bounds)", () => {
    for (const t of FRAGMENT_TEMPLATES) {
      expect(validateFragmentTemplate(t)).toEqual([]);
    }
  });

  it("has at least 3 templates per difficulty", () => {
    expect(getTemplatesForDifficulty("easy").length).toBeGreaterThanOrEqual(3);
    expect(getTemplatesForDifficulty("normal").length).toBeGreaterThanOrEqual(3);
    expect(getTemplatesForDifficulty("hard").length).toBeGreaterThanOrEqual(3);
  });

  it("keeps target fragment count ranges by difficulty", () => {
    for (const t of getTemplatesForDifficulty("easy")) {
      expect(t.pieces.length).toBeGreaterThanOrEqual(6);
      expect(t.pieces.length).toBeLessThanOrEqual(8);
    }
    for (const t of getTemplatesForDifficulty("normal")) {
      expect(t.pieces.length).toBeGreaterThanOrEqual(10);
      expect(t.pieces.length).toBeLessThanOrEqual(14);
    }
    for (const t of getTemplatesForDifficulty("hard")) {
      expect(t.pieces.length).toBeGreaterThanOrEqual(16);
      expect(t.pieces.length).toBeLessThanOrEqual(22);
    }
  });

  it("templates vary per difficulty (not repeated structure)", () => {
    for (const d of ["easy", "normal", "hard"] as const) {
      const signatures = new Set(
        getTemplatesForDifficulty(d).map((t) =>
          t.pieces
            .map((p) => `${p.x},${p.y},${p.w},${p.h}`)
            .sort()
            .join("|"),
        ),
      );
      expect(signatures.size).toBeGreaterThanOrEqual(3);
    }
  });

  it("random template helper is deterministic with seed", () => {
    const a = getRandomFragmentTemplate("hard", "stable-seed");
    const b = getRandomFragmentTemplate("hard", "stable-seed");
    expect(a?.id).toBe(b?.id);
  });

  it("random template helper varies across different seeds", () => {
    const picks = new Set(
      Array.from({ length: 12 }, (_, i) => getRandomFragmentTemplate("normal", `pick-${i}`)?.id ?? "none"),
    );
    expect(picks.size).toBeGreaterThan(1);
  });
});

describe("fragment geometry helpers", () => {
  it("piece and slot geometry are normalized and bounded", () => {
    for (const t of FRAGMENT_TEMPLATES) {
      for (const p of t.pieces) {
        const pieceStyle = getPieceStyle(p, t.grid);
        const slotStyle = getSlotStyle(p, t.grid);

        for (const style of [pieceStyle, slotStyle]) {
          expect(style.leftPercent).toBeGreaterThanOrEqual(0);
          expect(style.topPercent).toBeGreaterThanOrEqual(0);
          expect(style.widthPercent).toBeGreaterThan(0);
          expect(style.heightPercent).toBeGreaterThan(0);
          expect(style.leftPercent + style.widthPercent).toBeLessThanOrEqual(100);
          expect(style.topPercent + style.heightPercent).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it("piece normalized areas sum to full board area", () => {
    for (const t of FRAGMENT_TEMPLATES) {
      const totalAreaPercent = t.pieces
        .map((p) => getPieceStyle(p, t.grid))
        .reduce((acc, s) => acc + s.widthPercent * s.heightPercent, 0);
      expect(totalAreaPercent).toBeCloseTo(10000, 6);
    }
  });

  it("crop helper returns CSS-ready and valid percentages", () => {
    for (const t of FRAGMENT_TEMPLATES) {
      for (const p of t.pieces) {
        const crop = getFragmentBackgroundStyle(p, t.grid);
        expect(crop.backgroundPosition).toContain("%");
        expect(crop.backgroundSize).toContain("%");
        expect(crop.backgroundPositionXPercent).toBeGreaterThanOrEqual(0);
        expect(crop.backgroundPositionXPercent).toBeLessThanOrEqual(100);
        expect(crop.backgroundPositionYPercent).toBeGreaterThanOrEqual(0);
        expect(crop.backgroundPositionYPercent).toBeLessThanOrEqual(100);
        expect(crop.backgroundSizeWidthPercent).toBeGreaterThan(0);
        expect(crop.backgroundSizeHeightPercent).toBeGreaterThan(0);
      }
    }
  });
});

describe("fragment puzzle", () => {
  const template = FRAGMENT_TEMPLATES.find((t) => t.id === "easy-3x4-v1")!;

  it("build creates pieces and slots from template", () => {
    const s = buildFragmentPuzzle(template, "seed-a");
    expect(s.templateId).toBe(template.id);
    expect(s.pieces).toHaveLength(template.pieces.length);
    expect(s.slots).toHaveLength(template.pieces.length);
    expect(s.grid).toEqual(template.grid);
    for (const p of template.pieces) {
      expect(s.slots.some((sl) => sl.id === `slot-${p.id}`)).toBe(true);
    }
  });

  it("all pieces start unplaced", () => {
    const s = buildFragmentPuzzle(template, "x");
    expect(s.pieces.every((p) => p.currentSlotId === null)).toBe(true);
    expect(s.slots.every((sl) => sl.currentPieceId === null)).toBe(true);
  });

  it("tray order is deterministic by seed", () => {
    const a = buildFragmentPuzzle(template, "same");
    const b = buildFragmentPuzzle(template, "same");
    expect(a.trayOrder).toEqual(b.trayOrder);
  });

  it("different seeds usually differ in tray order", () => {
    const orders = new Set(
      ["s1", "s2", "s3", "s4", "s5"].map((seed) => JSON.stringify(buildFragmentPuzzle(template, seed).trayOrder)),
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it("placing from tray updates slot and increments moves", () => {
    const s = buildFragmentPuzzle(template, "place-test");
    const pieceId = s.trayOrder[0]!;
    const slotId = `slot-${pieceId}`;
    const r = placeFragmentPiece(s, pieceId, slotId);
    expect(r.placed).toBe(true);
    expect(r.state.moveCount).toBe(1);
    expect(r.state.pieces.find((p) => p.id === pieceId)!.currentSlotId).toBe(slotId);
    expect(r.state.slots.find((sl) => sl.id === slotId)!.currentPieceId).toBe(pieceId);
  });

  it("completion false until all correct", () => {
    const s = buildFragmentPuzzle(template, "c");
    expect(isFragmentPuzzleComplete(s)).toBe(false);
  });

  it("completion true when every piece is in its correct slot", () => {
    let s = buildFragmentPuzzle(template, "win");
    for (const p of s.pieces) {
      const r = placeFragmentPiece(s, p.id, p.correctSlotId);
      s = r.state;
      expect(r.placed).toBe(true);
    }
    expect(isFragmentPuzzleComplete(s)).toBe(true);
  });

  it("does not mutate inputs", () => {
    const s = buildFragmentPuzzle(template, "immut");
    const pieceId = s.trayOrder[0]!;
    const slotId = `slot-${pieceId}`;
    const frozenPieces = s.pieces.map((p) => ({ ...p }));
    const frozenSlots = s.slots.map((sl) => ({ ...sl }));
    const frozenTray = [...s.trayOrder];
    placeFragmentPiece(s, pieceId, slotId);
    expect(s.pieces.map((p) => ({ ...p }))).toEqual(frozenPieces);
    expect(s.slots.map((sl) => ({ ...sl }))).toEqual(frozenSlots);
    expect(s.trayOrder).toEqual(frozenTray);
  });

  it("invalid placement does not increment moves", () => {
    const s = buildFragmentPuzzle(template, "bad");
    const r = placeFragmentPiece(s, "no-such-piece", "slot-e1");
    expect(r.placed).toBe(false);
    expect(r.state.moveCount).toBe(s.moveCount);
  });

  it("swap two slotted pieces", () => {
    let s = buildFragmentPuzzle(template, "swap");
    const [a, b] = [s.pieces[0]!.id, s.pieces[1]!.id];
    s = placeFragmentPiece(s, a, `slot-${a}`).state;
    s = placeFragmentPiece(s, b, `slot-${b}`).state;
    const beforeMoves = s.moveCount;
    const r = placeFragmentPiece(s, a, `slot-${b}`);
    expect(r.placed).toBe(true);
    expect(r.state.moveCount).toBe(beforeMoves + 1);
    expect(r.state.pieces.find((p) => p.id === a)!.currentSlotId).toBe(`slot-${b}`);
    expect(r.state.pieces.find((p) => p.id === b)!.currentSlotId).toBe(`slot-${a}`);
  });
});

describe("shuffleWithSeed", () => {
  it("matches fragment tray contract", () => {
    const a = shuffleWithSeed(["a", "b", "c", "d"], "k1");
    const b = shuffleWithSeed(["a", "b", "c", "d"], "k1");
    const c = shuffleWithSeed(["a", "b", "c", "d"], "k2");
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});

describe("sliding puzzle", () => {
  it("build creates correct tile count and exactly one empty", () => {
    for (const diff of ["easy", "normal", "hard"] as const) {
      const s = buildSlidingPuzzle(diff, `grid-${diff}`);
      const n = s.grid.cols * s.grid.rows;
      expect(s.cells).toHaveLength(n);
      expect(new Set(s.cells).size).toBe(n);
      expect(s.cells.filter((id) => id === s.emptyTileId)).toHaveLength(1);
      expect(s.emptyTileId).toBe(n - 1);
    }
  });

  it("does not start solved", () => {
    for (const diff of ["easy", "normal", "hard"] as const) {
      for (let i = 0; i < 8; i++) {
        const s = buildSlidingPuzzle(diff, `ns-${diff}-${i}`);
        expect(isSlidingPuzzleComplete(s)).toBe(false);
      }
    }
  });

  it("shuffle is solvable", () => {
    for (const diff of ["easy", "normal", "hard"] as const) {
      for (let i = 0; i < 12; i++) {
        const s = buildSlidingPuzzle(diff, `sol-${diff}-${i}`);
        expect(
          isSlidingConfigurationSolvable(s.cells, s.grid.cols, s.grid.rows, s.emptyTileId),
        ).toBe(true);
      }
    }
  });

  it("same seed gives same layout", () => {
    const a = buildSlidingPuzzle("easy", "stable");
    const b = buildSlidingPuzzle("easy", "stable");
    expect(a.cells).toEqual(b.cells);
  });

  it("different seeds usually differ", () => {
    const layouts = new Set(
      Array.from({ length: 20 }, (_, i) => JSON.stringify(buildSlidingPuzzle("normal", `u-${i}`).cells)),
    );
    expect(layouts.size).toBeGreaterThan(3);
  });

  it("only adjacent tiles can move", () => {
    const s = buildSlidingPuzzle("easy", "adj");
    const { cols } = s.grid;
    const empty = s.emptyIndex;
    const ec = empty % cols;
    const er = Math.floor(empty / cols);
    for (let i = 0; i < s.cells.length; i++) {
      const id = s.cells[i]!;
      const ic = i % cols;
      const ir = Math.floor(i / cols);
      const manhattan = Math.abs(ic - ec) + Math.abs(ir - er);
      const adj = manhattan === 1;
      expect(canMoveTile(s, id)).toBe(adj && id !== s.emptyTileId);
    }
  });

  it("valid move increments move count; invalid does not", () => {
    const s = buildSlidingPuzzle("easy", "moves");
    const movable = s.cells.find((id) => id !== s.emptyTileId && canMoveTile(s, id))!;
    const rOk = moveTile(s, movable);
    expect(rOk.moved).toBe(true);
    expect(rOk.state.moveCount).toBe(1);

    const badTile = rOk.state.cells.find((id) => !canMoveTile(rOk.state, id) && id !== rOk.state.emptyTileId);
    if (badTile != null) {
      const rBad = moveTile(rOk.state, badTile);
      expect(rBad.moved).toBe(false);
      expect(rBad.state.moveCount).toBe(rOk.state.moveCount);
      expect(rBad.state).toBe(rOk.state);
    }
  });

  it("moveTileAtIndex matches moveTile for neighbor of empty", () => {
    const s = buildSlidingPuzzle("easy", "idx");
    const neighIdx = [s.emptyIndex - 1, s.emptyIndex + 1, s.emptyIndex - s.grid.cols, s.emptyIndex + s.grid.cols].find(
      (i) => i >= 0 && i < s.cells.length && canMoveTile(s, s.cells[i]!),
    )!;
    const tid = s.cells[neighIdx]!;
    const a = moveTile(s, tid);
    const b = moveTileAtIndex(s, neighIdx);
    expect(a.moved).toBe(true);
    expect(b.moved).toBe(true);
    expect(a.state.cells).toEqual(b.state.cells);
  });

  it("completion detects solved layout and toggles with a move and undo", () => {
    const grid = getPuzzleGridForDifficulty("easy");
    const n = grid.cols * grid.rows;
    const solvedCells = Array.from({ length: n }, (_, i) => i);
    const solved = {
      difficulty: "easy" as const,
      grid,
      cells: solvedCells,
      emptyTileId: n - 1,
      emptyIndex: n - 1,
      solvedCells,
      moveCount: 0,
    };
    expect(isSlidingPuzzleComplete(solved)).toBe(true);

    const neighborTileId = solved.cells[solved.emptyIndex - 1]!;
    const after = moveTile(solved, neighborTileId);
    expect(after.moved).toBe(true);
    expect(isSlidingPuzzleComplete(after.state)).toBe(false);

    const back = moveTile(after.state, neighborTileId);
    expect(back.moved).toBe(true);
    expect(isSlidingPuzzleComplete(back.state)).toBe(true);
  });

  it("inversion helper is stable for known permutation", () => {
    const cells = [1, 0, 3, 2];
    expect(slidingPuzzleInversionCount(cells, 4)).toBe(2);
  });
});
