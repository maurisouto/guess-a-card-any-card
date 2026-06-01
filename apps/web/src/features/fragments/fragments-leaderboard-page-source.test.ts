import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const clientSource = readFileSync(
  join(here, "components", "fragments-leaderboard-client.tsx"),
  "utf8",
);

describe("Fragments leaderboard page (Phase 6)", () => {
  it("includes category controls and empty archive copy", () => {
    expect(clientSource).toContain("Fastest restorations");
    expect(clientSource).toContain("Fewest moves");
    expect(clientSource).toContain("Most restorations");
    expect(clientSource).toContain("Most unique cards");
    expect(clientSource).toContain("All modes");
    expect(clientSource).toContain("The archive has no qualifying restorations");
  });
});
