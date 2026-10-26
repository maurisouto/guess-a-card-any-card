"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { getBrandFromPathname } from "@/lib/experience-brand";

const BG_GUESS = "magical-app-bg-guess";
const BG_CODEX = "magical-app-bg-codex";
const BG_FRAGMENTS = "magical-app-bg-fragments";
const LEGACY = "magical-app-bg";

/** Hub (`/`) uses Codex backdrop; all other routes use Guess. Syncs before paint via `useLayoutEffect`. */
export function AppBackgroundSync() {
  const pathname = usePathname();

  useLayoutEffect(() => {
    const body = document.body;
    const brand = getBrandFromPathname(pathname);
    body.classList.remove(BG_GUESS, BG_CODEX, BG_FRAGMENTS, LEGACY);
    body.classList.add(
      brand === "codex" ? BG_CODEX : brand === "fragments" ? BG_FRAGMENTS : BG_GUESS,
    );
  }, [pathname]);

  return null;
}
