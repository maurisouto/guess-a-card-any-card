import type { CatalogCard } from "@/server/services/card-catalog-service";

export type FragmentCompletionAction = {
  kind: "fragment";
  pieceId: string;
  slotId: string;
};

export type SlidingCompletionAction = {
  kind: "sliding";
  tileId: number;
};

export type FragmentsCompletionAction = FragmentCompletionAction | SlidingCompletionAction;

export type FragmentsCompletionVerificationInput = {
  cardId: string;
  cardName: string;
  cardImageUrl: string;
  fabSet: string | null;
  rarity: string | null;
  puzzleMode: "fragments" | "sliding";
  difficulty: "easy" | "normal" | "hard";
  timeMs: number;
  moves: number;
  seed: string;
  templateId: string | null;
  actions: FragmentsCompletionAction[];
};

export type CompletionVerificationResult =
  | { ok: true }
  | { ok: false; reason: string };

const fragmentTemplates: Record<string, { difficulty: FragmentsCompletionVerificationInput["difficulty"]; pieceIds: string[] }> = {
  "easy-3x4-v1": { difficulty: "easy", pieceIds: ["e1", "e2", "e3", "e4", "e5", "e6"] },
  "easy-3x4-v2": { difficulty: "easy", pieceIds: ["e1", "e2", "e3", "e4", "e5", "e6", "e7"] },
  "easy-3x4-v3": { difficulty: "easy", pieceIds: ["e1", "e2", "e3", "e4", "e5", "e6", "e7", "e8"] },
  "normal-4x5-v1": { difficulty: "normal", pieceIds: ["n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8", "n9", "n10", "n11", "n12"] },
  "normal-4x5-v2": { difficulty: "normal", pieceIds: ["n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8", "n9", "n10", "n11", "n12"] },
  "normal-4x5-v3": { difficulty: "normal", pieceIds: ["n1", "n2", "n3", "n4", "n5", "n6", "n7", "n8", "n9", "n10", "n11"] },
  "hard-5x6-v1": { difficulty: "hard", pieceIds: Array.from({ length: 16 }, (_, i) => `h${i + 1}`) },
  "hard-5x6-v2": { difficulty: "hard", pieceIds: Array.from({ length: 17 }, (_, i) => `h${i + 1}`) },
  "hard-5x6-v3": { difficulty: "hard", pieceIds: Array.from({ length: 18 }, (_, i) => `h${i + 1}`) },
};

function createSeededRandom(seed: string): () => number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += h << 13;
    h ^= h >>> 7;
    h += h << 3;
    h ^= h >>> 17;
    h += h << 5;
    return (h >>> 0) / 4294967295;
  };
}

function expectedTemplateId(
  difficulty: FragmentsCompletionVerificationInput["difficulty"],
  seed: string,
): string | null {
  const templates = Object.entries(fragmentTemplates).filter(([, value]) => value.difficulty === difficulty);
  const rand = createSeededRandom(`${seed}:fragments:template:${difficulty}`);
  return templates[Math.floor(rand() * templates.length)]?.[0] ?? null;
}

function verifyFragmentActions(
  templateId: string,
  actions: FragmentCompletionAction[],
): boolean {
  const template = fragmentTemplates[templateId];
  if (!template || actions.some((action) => action.kind !== "fragment")) return false;
  if (actions.length === 0 || actions.length > 10_000) return false;

  const pieceSlots = new Map(template.pieceIds.map((id) => [id, null as string | null]));
  const slotPieces = new Map(template.pieceIds.map((id) => [`slot-${id}`, null as string | null]));

  for (const action of actions) {
    if (!pieceSlots.has(action.pieceId) || !slotPieces.has(action.slotId)) return false;
    const currentSlot = pieceSlots.get(action.pieceId)!;
    if (currentSlot === action.slotId) return false;
    const occupyingPiece = slotPieces.get(action.slotId)!;

    if (occupyingPiece == null) {
      if (currentSlot != null) slotPieces.set(currentSlot, null);
    } else if (currentSlot == null) {
      pieceSlots.set(occupyingPiece, null);
    } else {
      slotPieces.set(currentSlot, occupyingPiece);
      pieceSlots.set(occupyingPiece, currentSlot);
    }

    slotPieces.set(action.slotId, action.pieceId);
    pieceSlots.set(action.pieceId, action.slotId);
  }

  return template.pieceIds.every((id) => pieceSlots.get(id) === `slot-${id}`);
}

function neighborsOfIndex(index: number, cols: number, rows: number): number[] {
  const col = index % cols;
  const row = Math.floor(index / cols);
  const out: number[] = [];
  if (col > 0) out.push(index - 1);
  if (col < cols - 1) out.push(index + 1);
  if (row > 0) out.push(index - cols);
  if (row < rows - 1) out.push(index + cols);
  return out;
}

function verifySlidingActions(
  difficulty: FragmentsCompletionVerificationInput["difficulty"],
  seed: string,
  actions: SlidingCompletionAction[],
): boolean {
  const dimensions = { easy: [3, 4], normal: [4, 5], hard: [5, 6] }[difficulty];
  const [cols, rows] = dimensions;
  const emptyTileId = cols * rows - 1;
  let cells = Array.from({ length: cols * rows }, (_, i) => i);
  let emptyIndex = emptyTileId;
  const rand = createSeededRandom(`${seed}:sliding:shuffle`);
  const swap = (a: number, b: number) => {
    [cells[a], cells[b]] = [cells[b]!, cells[a]!];
  };

  const scrambleMoves = 120 + Math.floor(rand() * 180);
  for (let i = 0; i < scrambleMoves; i++) {
    const neighbors = neighborsOfIndex(emptyIndex, cols, rows);
    const next = neighbors[Math.floor(rand() * neighbors.length)]!;
    swap(emptyIndex, next);
    emptyIndex = next;
  }
  if (cells.every((value, index) => value === index)) {
    const next = neighborsOfIndex(emptyIndex, cols, rows)[0]!;
    swap(emptyIndex, next);
    emptyIndex = next;
  }

  if (actions.length === 0 || actions.length > 100_000) return false;
  for (const action of actions) {
    if (action.kind !== "sliding" || !Number.isInteger(action.tileId) || action.tileId === emptyTileId) {
      return false;
    }
    const tileIndex = cells.indexOf(action.tileId);
    if (!neighborsOfIndex(emptyIndex, cols, rows).includes(tileIndex)) return false;
    swap(tileIndex, emptyIndex);
    emptyIndex = tileIndex;
  }
  return cells.every((value, index) => value === index);
}

export function verifyFragmentsCompletion(
  input: FragmentsCompletionVerificationInput,
  card: CatalogCard | null,
): CompletionVerificationResult {
  if (!card) return { ok: false, reason: "Card is not a playable catalog printing." };
  if (
    card.id !== input.cardId ||
    card.name !== input.cardName ||
    card.imageUrl !== input.cardImageUrl ||
    card.setKey !== input.fabSet ||
    (card.printing.rarity == null ? null : String(card.printing.rarity)) !== input.rarity
  ) {
    return { ok: false, reason: "Card metadata does not match the catalog." };
  }
  if (input.moves !== input.actions.length || input.timeMs < 500) {
    return { ok: false, reason: "Completion metrics do not match the submitted proof." };
  }

  if (input.puzzleMode === "fragments") {
    if (!input.templateId || fragmentTemplates[input.templateId]?.difficulty !== input.difficulty) {
      return { ok: false, reason: "Invalid fragment template." };
    }
    if (expectedTemplateId(input.difficulty, input.seed) !== input.templateId) {
      return { ok: false, reason: "Fragment template does not match the puzzle seed." };
    }
    return verifyFragmentActions(input.templateId, input.actions as FragmentCompletionAction[])
      ? { ok: true }
      : { ok: false, reason: "Fragment move proof is invalid." };
  }

  if (input.templateId !== null) return { ok: false, reason: "Sliding puzzles cannot use a template." };
  return verifySlidingActions(input.difficulty, input.seed, input.actions as SlidingCompletionAction[])
    ? { ok: true }
    : { ok: false, reason: "Sliding move proof is invalid." };
}
