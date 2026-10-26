/**
 * Codex of Rathe — brand context for chrome (header, background, auth UI, profile chrome).
 * One account; UI follows the active experience.
 */
export type Brand = "codex" | "guess" | "fragments";

/**
 * Single source of truth: route → brand.
 *
 * Codex: hub, global profile, Codex public profile.
 * Guess: Guess app, gameplay modes, Guess profile, Guess public profile, leaderboard.
 */
export function getBrandFromPathname(pathname: string | null | undefined): Brand {
  if (pathname == null || pathname === "") return "guess";
  const path = pathname.split("?")[0]?.replace(/\/+$/, "") ?? "";
  const normalized = path === "" ? "/" : path;

  if (normalized === "/" || normalized === "/profile") {
    return "codex";
  }

  // Guess public profile — before generic `/u/[id]` Codex match.
  if (/^\/u\/[^/]+\/guess(\/.*)?$/.test(normalized)) {
    return "guess";
  }
  if (/^\/u\/[^/]+\/puzzle(\/.*)?$/.test(normalized)) {
    return "fragments";
  }

  if (/^\/u\/[^/]+$/.test(normalized)) {
    return "codex";
  }

  if (
    normalized.startsWith("/puzzle") ||
    normalized.startsWith("/guess") ||
    normalized.startsWith("/single") ||
    normalized.startsWith("/challenge") ||
    normalized.startsWith("/coop") ||
    normalized.startsWith("/competitive") ||
    normalized.startsWith("/leaderboard")
  ) {
    return normalized.startsWith("/puzzle") ? "fragments" : "guess";
  }

  return "guess";
}

export function getProfilePathForBrand(brand: Brand): string {
  if (brand === "guess") return "/guess/profile";
  if (brand === "fragments") return "/puzzle/profile";
  return "/profile";
}

export function getPublicProfilePathForBrand(userId: string, brand: Brand): string {
  const id = encodeURIComponent(userId);
  if (brand === "guess") return `/u/${id}/guess`;
  if (brand === "fragments") return `/u/${id}/puzzle`;
  return `/u/${id}`;
}
