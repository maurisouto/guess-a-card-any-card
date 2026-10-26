"use client";

import { usePathname } from "next/navigation";
import { GameLogo } from "@/components/brand/game-logo";
import { getBrandFromPathname } from "@/lib/experience-brand";

/** Header mark: Codex on hub (`/`), Guess everywhere else. */
export function SiteHeaderLogo() {
  const pathname = usePathname();
  const brand = getBrandFromPathname(pathname);
  const logoBrand = brand === "codex" ? "codex" : "guess";
  const href = logoBrand === "codex" ? "/" : "/guess";
  return <GameLogo placement="header" brand={logoBrand} href={href} />;
}
