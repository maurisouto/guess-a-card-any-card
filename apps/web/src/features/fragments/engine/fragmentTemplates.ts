import { createSeededRandom } from "@/lib/utils/seededRandom";

import type { FragmentTemplate, PuzzleDifficulty } from "./types";

export const FRAGMENT_TEMPLATES: FragmentTemplate[] = [
  {
    id: "easy-3x4-v1",
    difficulty: "easy",
    grid: { cols: 3, rows: 4 },
    pieces: [
      { id: "e1", x: 0, y: 0, w: 2, h: 1 },
      { id: "e2", x: 2, y: 0, w: 1, h: 1 },
      { id: "e3", x: 0, y: 1, w: 1, h: 1 },
      { id: "e4", x: 1, y: 1, w: 2, h: 1 },
      { id: "e5", x: 0, y: 2, w: 1, h: 2 },
      { id: "e6", x: 1, y: 2, w: 2, h: 2 },
    ],
  },
  {
    id: "easy-3x4-v2",
    difficulty: "easy",
    grid: { cols: 3, rows: 4 },
    pieces: [
      { id: "e1", x: 0, y: 0, w: 1, h: 2 },
      { id: "e2", x: 1, y: 0, w: 2, h: 1 },
      { id: "e3", x: 1, y: 1, w: 1, h: 1 },
      { id: "e4", x: 2, y: 1, w: 1, h: 2 },
      { id: "e5", x: 0, y: 2, w: 2, h: 1 },
      { id: "e6", x: 0, y: 3, w: 1, h: 1 },
      { id: "e7", x: 1, y: 3, w: 2, h: 1 },
    ],
  },
  {
    id: "easy-3x4-v3",
    difficulty: "easy",
    grid: { cols: 3, rows: 4 },
    pieces: [
      { id: "e1", x: 0, y: 0, w: 1, h: 1 },
      { id: "e2", x: 1, y: 0, w: 2, h: 1 },
      { id: "e3", x: 0, y: 1, w: 2, h: 1 },
      { id: "e4", x: 2, y: 1, w: 1, h: 1 },
      { id: "e5", x: 0, y: 2, w: 1, h: 2 },
      { id: "e6", x: 1, y: 2, w: 1, h: 1 },
      { id: "e7", x: 2, y: 2, w: 1, h: 2 },
      { id: "e8", x: 1, y: 3, w: 1, h: 1 },
    ],
  },
  {
    id: "normal-4x5-v1",
    difficulty: "normal",
    grid: { cols: 4, rows: 5 },
    pieces: [
      { id: "n1", x: 0, y: 0, w: 1, h: 1 },
      { id: "n2", x: 1, y: 0, w: 1, h: 1 },
      { id: "n3", x: 2, y: 0, w: 2, h: 1 },
      { id: "n4", x: 0, y: 1, w: 2, h: 1 },
      { id: "n5", x: 2, y: 1, w: 1, h: 2 },
      { id: "n6", x: 3, y: 1, w: 1, h: 1 },
      { id: "n7", x: 0, y: 2, w: 1, h: 2 },
      { id: "n8", x: 1, y: 2, w: 1, h: 1 },
      { id: "n9", x: 3, y: 2, w: 1, h: 2 },
      { id: "n10", x: 1, y: 3, w: 2, h: 2 },
      { id: "n11", x: 0, y: 4, w: 1, h: 1 },
      { id: "n12", x: 3, y: 4, w: 1, h: 1 },
    ],
  },
  {
    id: "normal-4x5-v2",
    difficulty: "normal",
    grid: { cols: 4, rows: 5 },
    pieces: [
      { id: "n1", x: 0, y: 0, w: 2, h: 1 },
      { id: "n2", x: 2, y: 0, w: 1, h: 1 },
      { id: "n3", x: 3, y: 0, w: 1, h: 2 },
      { id: "n4", x: 0, y: 1, w: 1, h: 2 },
      { id: "n5", x: 1, y: 1, w: 2, h: 2 },
      { id: "n6", x: 3, y: 2, w: 1, h: 1 },
      { id: "n7", x: 0, y: 3, w: 2, h: 1 },
      { id: "n8", x: 2, y: 3, w: 1, h: 2 },
      { id: "n9", x: 3, y: 3, w: 1, h: 1 },
      { id: "n10", x: 0, y: 4, w: 1, h: 1 },
      { id: "n11", x: 1, y: 4, w: 1, h: 1 },
      { id: "n12", x: 3, y: 4, w: 1, h: 1 },
    ],
  },
  {
    id: "normal-4x5-v3",
    difficulty: "normal",
    grid: { cols: 4, rows: 5 },
    pieces: [
      { id: "n1", x: 0, y: 0, w: 1, h: 2 },
      { id: "n2", x: 1, y: 0, w: 1, h: 1 },
      { id: "n3", x: 2, y: 0, w: 2, h: 1 },
      { id: "n4", x: 1, y: 1, w: 2, h: 1 },
      { id: "n5", x: 3, y: 1, w: 1, h: 2 },
      { id: "n6", x: 0, y: 2, w: 1, h: 1 },
      { id: "n7", x: 1, y: 2, w: 2, h: 2 },
      { id: "n8", x: 0, y: 3, w: 1, h: 1 },
      { id: "n9", x: 3, y: 3, w: 1, h: 1 },
      { id: "n10", x: 0, y: 4, w: 2, h: 1 },
      { id: "n11", x: 2, y: 4, w: 2, h: 1 },
    ],
  },
  {
    id: "hard-5x6-v1",
    difficulty: "hard",
    grid: { cols: 5, rows: 6 },
    pieces: [
      { id: "h1", x: 0, y: 0, w: 2, h: 1 },
      { id: "h2", x: 2, y: 0, w: 1, h: 1 },
      { id: "h3", x: 3, y: 0, w: 2, h: 1 },
      { id: "h4", x: 0, y: 1, w: 1, h: 2 },
      { id: "h5", x: 1, y: 1, w: 2, h: 1 },
      { id: "h6", x: 3, y: 1, w: 1, h: 1 },
      { id: "h7", x: 4, y: 1, w: 1, h: 2 },
      { id: "h8", x: 1, y: 2, w: 1, h: 1 },
      { id: "h9", x: 2, y: 2, w: 2, h: 1 },
      { id: "h10", x: 0, y: 3, w: 2, h: 1 },
      { id: "h11", x: 2, y: 3, w: 1, h: 2 },
      { id: "h12", x: 3, y: 3, w: 2, h: 1 },
      { id: "h13", x: 0, y: 4, w: 1, h: 2 },
      { id: "h14", x: 1, y: 4, w: 1, h: 1 },
      { id: "h15", x: 3, y: 4, w: 2, h: 2 },
      { id: "h16", x: 1, y: 5, w: 2, h: 1 },
    ],
  },
  {
    id: "hard-5x6-v2",
    difficulty: "hard",
    grid: { cols: 5, rows: 6 },
    pieces: [
      { id: "h1", x: 0, y: 0, w: 1, h: 1 },
      { id: "h2", x: 1, y: 0, w: 1, h: 2 },
      { id: "h3", x: 2, y: 0, w: 2, h: 1 },
      { id: "h4", x: 4, y: 0, w: 1, h: 2 },
      { id: "h5", x: 0, y: 1, w: 1, h: 2 },
      { id: "h6", x: 2, y: 1, w: 2, h: 2 },
      { id: "h7", x: 1, y: 2, w: 1, h: 1 },
      { id: "h8", x: 4, y: 2, w: 1, h: 1 },
      { id: "h9", x: 0, y: 3, w: 2, h: 1 },
      { id: "h10", x: 2, y: 3, w: 1, h: 1 },
      { id: "h11", x: 3, y: 3, w: 2, h: 1 },
      { id: "h12", x: 0, y: 4, w: 1, h: 2 },
      { id: "h13", x: 1, y: 4, w: 2, h: 1 },
      { id: "h14", x: 3, y: 4, w: 1, h: 2 },
      { id: "h15", x: 4, y: 4, w: 1, h: 1 },
      { id: "h16", x: 1, y: 5, w: 2, h: 1 },
      { id: "h17", x: 4, y: 5, w: 1, h: 1 },
    ],
  },
  {
    id: "hard-5x6-v3",
    difficulty: "hard",
    grid: { cols: 5, rows: 6 },
    pieces: [
      { id: "h1", x: 0, y: 0, w: 1, h: 1 },
      { id: "h2", x: 1, y: 0, w: 1, h: 1 },
      { id: "h3", x: 2, y: 0, w: 1, h: 1 },
      { id: "h4", x: 3, y: 0, w: 2, h: 1 },
      { id: "h5", x: 0, y: 1, w: 2, h: 1 },
      { id: "h6", x: 2, y: 1, w: 1, h: 2 },
      { id: "h7", x: 3, y: 1, w: 1, h: 1 },
      { id: "h8", x: 4, y: 1, w: 1, h: 2 },
      { id: "h9", x: 0, y: 2, w: 1, h: 1 },
      { id: "h10", x: 1, y: 2, w: 1, h: 2 },
      { id: "h11", x: 3, y: 2, w: 1, h: 1 },
      { id: "h12", x: 0, y: 3, w: 1, h: 1 },
      { id: "h13", x: 2, y: 3, w: 2, h: 1 },
      { id: "h14", x: 4, y: 3, w: 1, h: 2 },
      { id: "h15", x: 0, y: 4, w: 2, h: 1 },
      { id: "h16", x: 2, y: 4, w: 2, h: 2 },
      { id: "h17", x: 0, y: 5, w: 2, h: 1 },
      { id: "h18", x: 4, y: 5, w: 1, h: 1 },
    ],
  },
];

export type TemplateValidationIssue =
  | { code: "grid_mismatch"; message: string }
  | { code: "out_of_bounds"; pieceId: string; message: string }
  | { code: "overlap"; a: string; b: string; message: string }
  | { code: "uncovered"; message: string }
  | { code: "duplicate_piece_id"; pieceId: string };

function pieceCells(p: { x: number; y: number; w: number; h: number }): Set<string> {
  const s = new Set<string>();
  for (let y = p.y; y < p.y + p.h; y++) {
    for (let x = p.x; x < p.x + p.w; x++) {
      s.add(`${x},${y}`);
    }
  }
  return s;
}

export function validateFragmentTemplate(template: FragmentTemplate): TemplateValidationIssue[] {
  const issues: TemplateValidationIssue[] = [];
  const { cols, rows } = template.grid;
  const expectedArea = cols * rows;

  const seenIds = new Set<string>();
  for (const p of template.pieces) {
    if (seenIds.has(p.id)) {
      issues.push({ code: "duplicate_piece_id", pieceId: p.id });
    }
    seenIds.add(p.id);

    if (p.x < 0 || p.y < 0 || p.x + p.w > cols || p.y + p.h > rows) {
      issues.push({
        code: "out_of_bounds",
        pieceId: p.id,
        message: `Piece ${p.id} extends outside ${cols}×${rows}`,
      });
    }
  }

  const covered = new Set<string>();
  for (let i = 0; i < template.pieces.length; i++) {
    const a = template.pieces[i]!;
    const cellsA = pieceCells(a);
    for (let j = i + 1; j < template.pieces.length; j++) {
      const b = template.pieces[j]!;
      const cellsB = pieceCells(b);
      for (const c of cellsA) {
        if (cellsB.has(c)) {
          issues.push({
            code: "overlap",
            a: a.id,
            b: b.id,
            message: `Pieces ${a.id} and ${b.id} overlap at ${c}`,
          });
        }
      }
    }
    for (const c of cellsA) {
      covered.add(c);
    }
  }

  if (covered.size !== expectedArea) {
    issues.push({
      code: "uncovered",
      message: `Expected ${expectedArea} cells covered, got ${covered.size}`,
    });
  }

  return issues;
}

export function assertValidFragmentTemplate(template: FragmentTemplate): void {
  const issues = validateFragmentTemplate(template);
  if (issues.length > 0) {
    throw new Error(`Invalid fragment template ${template.id}: ${JSON.stringify(issues)}`);
  }
}

export function getTemplatesForDifficulty(difficulty: PuzzleDifficulty): FragmentTemplate[] {
  return FRAGMENT_TEMPLATES.filter((t) => t.difficulty === difficulty);
}

export function getFragmentTemplateById(id: string): FragmentTemplate | undefined {
  return FRAGMENT_TEMPLATES.find((t) => t.id === id);
}

export function getRandomFragmentTemplate(
  difficulty: PuzzleDifficulty,
  seed?: string,
): FragmentTemplate | undefined {
  const templates = getTemplatesForDifficulty(difficulty);
  if (templates.length === 0) return undefined;

  if (seed == null) {
    const i = Math.floor(Math.random() * templates.length);
    return templates[i];
  }

  const rand = createSeededRandom(`${seed}:fragments:template:${difficulty}`);
  const i = Math.floor(rand() * templates.length);
  return templates[i];
}
