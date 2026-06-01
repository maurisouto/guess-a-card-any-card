import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "fragments-profile-view.tsx"), "utf8");

describe("Fragments profile view (Phase 5.5)", () => {
  it("includes restoration-oriented sections and empty copy", () => {
    expect(source).toContain("No fragments restored yet.");
    expect(source).toContain("The archive awaits.");
    expect(source).toContain("Restoration highlights");
    expect(source).toContain("Set restoration");
    expect(source).toContain("Recent activity");
    expect(source).toContain("By mode");
    expect(source).toContain("By difficulty");
    expect(source).toContain("Return to restorations");
  });
});
