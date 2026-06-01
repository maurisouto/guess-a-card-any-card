import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, "..", "..");

const header = readFileSync(join(webRoot, "components", "layout", "fragments-header.tsx"), "utf8");
const entryRail = readFileSync(
  join(webRoot, "features", "fragments", "components", "fragments-puzzle-entry-rail.tsx"),
  "utf8",
);
const playClient = readFileSync(
  join(webRoot, "features", "fragments", "components", "fragments-play-client.tsx"),
  "utf8",
);
const mobileNav = readFileSync(join(webRoot, "components", "layout", "mobile-nav.tsx"), "utf8");
const leaderboard = readFileSync(
  join(webRoot, "features", "fragments", "components", "fragments-leaderboard-client.tsx"),
  "utf8",
);
const profileView = readFileSync(join(webRoot, "components", "profile", "fragments-profile-view.tsx"), "utf8");
const leaderboardPage = readFileSync(
  join(webRoot, "app", "(public)", "puzzle", "leaderboard", "page.tsx"),
  "utf8",
);

describe("Fragments Phase 6.5 navigation wiring", () => {
  it("header exposes Play, Hall of records, Codex, and signed-in archive", () => {
    expect(header).toContain('href: "/puzzle"');
    expect(header).toContain("Hall of records");
    expect(header).toContain("/puzzle/leaderboard");
    expect(header).toContain("/puzzle/profile");
    expect(header).toContain('href: "/"');
    expect(header).toContain("MobileNav");
  });

  it("play entry mounts journey rail before setup", () => {
    expect(playClient).toContain("FragmentsPuzzleEntryRail");
    expect(playClient).toContain("FragmentsSetupPanel");
    expect(entryRail).toContain("/puzzle/leaderboard");
    expect(entryRail).toContain("/puzzle/profile");
    expect(entryRail).toContain("Codex hub");
  });

  it("mobile menu includes Fragments destinations when brand is fragments", () => {
    expect(mobileNav).toContain("fragmentsNavGroups");
    expect(mobileNav).toContain('href: "/puzzle/leaderboard"');
    expect(mobileNav).toContain("Your archive");
  });

  it("profile and leaderboard cross-link restorations and archive", () => {
    expect(profileView).toContain("Return to restorations");
    expect(profileView).toContain("/puzzle/leaderboard");
    expect(leaderboard).toContain("Return to restorations");
    expect(leaderboard).toContain("/puzzle/profile");
  });

  it("leaderboard route page exists", () => {
    expect(leaderboardPage).toContain("FragmentsLeaderboardClient");
    expect(leaderboardPage).toContain("Hall of records");
  });
});
