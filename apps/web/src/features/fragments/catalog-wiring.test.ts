import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const puzzleHookSource = readFileSync(join(here, "hooks", "use-fragments-puzzle-game.ts"), "utf8");

describe("Fragments catalog wiring (Phase 4.6)", () => {
  it("loads FAB sets via catalog hook, not single-player game hook", () => {
    expect(puzzleHookSource).toContain("useCatalogFabSets");
    expect(puzzleHookSource).not.toMatch(/use-single-player-game/);
    expect(puzzleHookSource).not.toMatch(/useSinglePlayerFabSets/);
  });
});
