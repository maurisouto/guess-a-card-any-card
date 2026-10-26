"use client";

import Link from "next/link";
import { useState } from "react";
import { siteConfig } from "@/lib/config/site";
import { codexAssetPaths, guessAssetPaths } from "@/lib/design-tokens";
import { cn } from "@/lib/utils/cn";

export type GameLogoProps = {
  className?: string;
  href?: string;
  /** When set, opens the link in a new tab (e.g. Codex hub → mini-game). */
  openInNewTab?: boolean;
  /** Hub vs Guess artwork (`/public/assets/codex-*` vs `guess-*`). */
  brand?: "guess" | "codex";
  /** `header` = compact mark. `hero` = full lockup, larger on page. */
  placement: "header" | "hero";
};

const placementStyles = {
  header: {
    srcKey: "logoMark" as const,
    className:
      "h-11 max-h-11 w-auto max-w-[min(240px,48vw)] sm:h-12 sm:max-h-12 md:h-14 md:max-h-14 md:max-w-[min(280px,36vw)]",
    intrinsic: { w: 400, h: 120 },
    fallbackClass: "text-base sm:text-lg md:text-xl",
  },
  hero: {
    srcKey: "logoLockup" as const,
    className:
      "h-[clamp(10rem,32vw,18rem)] max-h-[20rem] w-auto max-w-[min(96vw,42rem)] sm:h-[clamp(11.5rem,34vw,20rem)] sm:max-h-[22rem] md:max-h-[24rem] lg:h-[clamp(12rem,36vw,22rem)] lg:max-h-[26rem] lg:max-w-[min(48rem,96vw)]",
    intrinsic: { w: 1200, h: 360 },
    fallbackClass: "text-2xl sm:text-3xl md:text-4xl lg:text-5xl",
  },
} as const;

const CODEX_ALT = "Codex of Rathe";

export function GameLogo({
  className,
  href = "/",
  openInNewTab = false,
  brand = "guess",
  placement,
}: GameLogoProps) {
  const [imgError, setImgError] = useState(false);
  const cfg = placementStyles[placement];
  const assets = brand === "codex" ? codexAssetPaths : guessAssetPaths;
  const src = assets[cfg.srcKey];
  const { intrinsic, className: sizeClass, fallbackClass } = cfg;
  const alt = brand === "codex" ? CODEX_ALT : siteConfig.name;
  const fallbackLabel = brand === "codex" ? "Codex" : siteConfig.shortName;

  const inner = imgError ? (
    <span
      className={cn(
        "font-display text-gradient-gold inline-flex items-center font-semibold uppercase tracking-[0.22em]",
        fallbackClass,
      )}
    >
      {fallbackLabel}
    </span>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={intrinsic.w}
      height={intrinsic.h}
      decoding="async"
      fetchPriority={placement === "hero" ? "high" : "auto"}
      className={cn("block object-contain object-center", sizeClass, className)}
      onError={() => setImgError(true)}
    />
  );

  return (
    <Link
      href={href}
      {...(openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        "group relative inline-flex shrink-0 items-center justify-center outline-none transition-[filter] duration-300 hover:drop-shadow-[0_0_20px_rgba(201,162,39,0.5)] focus-visible:ring-2 focus-visible:ring-[var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--void-deep)]",
        placement === "hero" && "w-full max-w-none justify-center",
      )}
    >
      {inner}
    </Link>
  );
}
