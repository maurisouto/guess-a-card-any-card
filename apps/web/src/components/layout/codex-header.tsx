"use client";

import { SiteHeaderAuth } from "@/components/auth/site-header-auth";
import { GameLogo } from "@/components/brand/game-logo";

/** Codex-only title bar for hub (`/`). */
export function CodexHeader() {
  return (
    <header className="relative z-20 border-b border-[#86B9FF]/20 bg-[linear-gradient(180deg,rgba(14,18,28,0.96)_0%,rgba(21,28,44,0.94)_74%,rgba(13,18,28,0.97)_100%)] shadow-[0_10px_30px_rgba(0,0,0,0.34)] backdrop-blur-md">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#9CC4FF]/42 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-full w-[min(44rem,100%)] -translate-x-1/2 bg-[radial-gradient(circle_at_center,rgba(96,165,250,0.12),transparent_62%)]"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-24 max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:min-h-28 sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <GameLogo brand="codex" placement="header" href="/" className="h-11 max-h-11 sm:h-12 sm:max-h-12" />
          <div className="min-w-0">
            <p className="font-codex text-xs text-[#AFC3EC] sm:text-sm">Many paths. One world.</p>
            <p className="hidden text-xs text-[#8DA8D8] sm:block">
              A collection of Flesh and Blood-inspired experiences.
            </p>
          </div>
        </div>

        <div className="shrink-0">
          <SiteHeaderAuth />
        </div>
      </div>
    </header>
  );
}
