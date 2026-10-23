import { describe, expect, it } from "vitest";
import type { CatalogCard } from "@/server/services/card-catalog-service";
import { verifyFragmentsCompletion } from "@/server/services/fragments-completion-verifier";

function card(overrides: Partial<CatalogCard> = {}): CatalogCard {
  return {
    id: "card-1",
    cardIdentifier: "card-1",
    printingIdentifier: "printing-1",
    printingIndex: 0,
    name: "Test Card",
    imageUrl: "https://img/card-1.png",
    setKey: "Monarch",
    fabCard: {} as CatalogCard["fabCard"],
    printing: { rarity: "Common" } as CatalogCard["printing"],
    ...overrides,
  };
}

describe("verifyFragmentsCompletion", () => {
  it("rejects forged card metadata before checking the move proof", () => {
    const result = verifyFragmentsCompletion(
      {
        cardId: "card-1",
        cardName: "Forged Card",
        cardImageUrl: "https://img/card-1.png",
        fabSet: "Monarch",
        rarity: "Common",
        puzzleMode: "fragments",
        difficulty: "easy",
        timeMs: 1000,
        moves: 1,
        seed: "seed-a",
        templateId: "easy-3x4-v1",
        actions: [{ kind: "fragment", pieceId: "e1", slotId: "slot-e1" }],
      },
      card(),
    );

    expect(result).toEqual({ ok: false, reason: "Card metadata does not match the catalog." });
  });

  it("rejects a move count that does not match the replay proof", () => {
    const result = verifyFragmentsCompletion(
      {
        cardId: "card-1",
        cardName: "Test Card",
        cardImageUrl: "https://img/card-1.png",
        fabSet: "Monarch",
        rarity: "Common",
        puzzleMode: "fragments",
        difficulty: "easy",
        timeMs: 1000,
        moves: 99,
        seed: "seed-a",
        templateId: "easy-3x4-v1",
        actions: [{ kind: "fragment", pieceId: "e1", slotId: "slot-e1" }],
      },
      card(),
    );

    expect(result).toEqual({ ok: false, reason: "Completion metrics do not match the submitted proof." });
  });

  it("rejects incomplete fragment proofs", () => {
    const result = verifyFragmentsCompletion(
      {
        cardId: "card-1",
        cardName: "Test Card",
        cardImageUrl: "https://img/card-1.png",
        fabSet: "Monarch",
        rarity: "Common",
        puzzleMode: "fragments",
        difficulty: "easy",
        timeMs: 1000,
        moves: 1,
        seed: "seed-a",
        templateId: "easy-3x4-v1",
        actions: [{ kind: "fragment", pieceId: "e1", slotId: "slot-e1" }],
      },
      card(),
    );

    expect(result.ok).toBe(false);
  });
});
