import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const hookSource = readFileSync(join(here, "hooks", "use-fragments-puzzle-game.ts"), "utf8");
const resultPanelSource = readFileSync(join(here, "components", "puzzle-result-panel.tsx"), "utf8");
const ownProfilePageSource = readFileSync(
  join(here, "..", "..", "app", "(public)", "puzzle", "profile", "page.tsx"),
  "utf8",
);
const publicProfilePageSource = readFileSync(
  join(here, "..", "..", "app", "(public)", "u", "[userId]", "puzzle", "page.tsx"),
  "utf8",
);

describe("Fragments Phase 5 persistence wiring", () => {
  it("authenticated completion submits through fragments API", () => {
    expect(hookSource).toContain("postFragmentsCompletion");
    expect(hookSource).toContain("completionSaveState");
  });

  it("guest result messaging includes save CTA and retry warning", () => {
    expect(hookSource).toContain("Sign in to preserve your restorations in the archive.");
    expect(hookSource).toContain("Could not save this run. You can retry.");
    expect(resultPanelSource).toContain("Retry save");
  });

  it("fragments profile routes are present", () => {
    expect(ownProfilePageSource).toContain("FragmentsProfilePageClient");
    expect(publicProfilePageSource).toContain("FragmentsPublicProfileClient");
  });
});
