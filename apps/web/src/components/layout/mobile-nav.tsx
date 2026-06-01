"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getBrandFromPathname, getProfilePathForBrand } from "@/lib/experience-brand";
import { cn } from "@/lib/utils/cn";

const guessNavGroups = [
  {
    label: "Play",
    links: [
      { href: "/single", label: "Single Player" },
      { href: "/competitive", label: "Multiplayer" },
      { href: "/coop", label: "Co-op" },
      { href: "/challenge", label: "Challenge" },
    ],
  },
  {
    label: "Account",
    links: [
      { href: "/stats", label: "Stats" },
      { href: "/leaderboard", label: "Leaderboard" },
    ],
  },
] as const;

const fragmentsNavGroups = [
  {
    label: "Fragments",
    links: [
      { href: "/puzzle", label: "Play" },
      { href: "/puzzle/profile", label: "Your archive" },
      { href: "/puzzle/leaderboard", label: "Hall of records" },
    ],
  },
  {
    label: "Codex",
    links: [
      { href: "/", label: "Hub" },
      { href: "/profile", label: "Reader profile" },
    ],
  },
] as const;

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const brand = getBrandFromPathname(pathname);
  const groups =
    brand === "fragments"
      ? fragmentsNavGroups
      : guessNavGroups.map((group) =>
          group.label === "Account"
            ? {
                ...group,
                links: [...group.links, { href: getProfilePathForBrand(brand), label: "Profile" }],
              }
            : group,
        );

  // Close menu on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative z-10 flex h-9 w-9 items-center justify-center rounded-md transition-colors lg:hidden",
          brand === "fragments"
            ? "text-[#86efac]/80 hover:bg-[#17352b]/55 hover:text-[#d9ffe8]"
            : "text-[var(--parchment-dim)] hover:bg-[var(--wine)]/40 hover:text-[var(--gold-bright)]",
        )}
        aria-label={open ? "Close navigation" : "Open navigation"}
        aria-expanded={open}
        aria-haspopup="true"
      >
        {open ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-5 w-5"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-5 w-5"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[1px]"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          {/* Slide-down panel — positioned relative to header (header has `relative`) */}
          <nav
            aria-label="Mobile navigation"
            className={cn(
              "absolute left-0 right-0 top-full z-40",
              "shadow-[0_20px_48px_rgba(0,0,0,0.65)] backdrop-blur-md",
              brand === "fragments"
                ? "border-b border-[#2F7F5F]/45 bg-gradient-to-b from-[#0b1210]/98 to-[#0a1512]/96"
                : "border-b border-[var(--wine-deep)]/80 bg-gradient-to-b from-[var(--void)]/98 to-[var(--plum)]/96",
            )}
          >
            <div className="mx-auto max-w-6xl px-4 py-4">
              {groups.map((group, gi) => (
                <div key={group.label} className={cn(gi > 0 && "mt-3 border-t pt-3", brand === "fragments" ? "border-[#214537]/50" : "border-[var(--wine-deep)]/40")}>
                  <p
                    className={cn(
                      "mb-2 px-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em]",
                      brand === "fragments" ? "text-[#7aab92]/85" : "text-[var(--mist)]/60",
                    )}
                  >
                    {group.label}
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {group.links.map(({ href, label }) => {
                      const active = pathname === href || pathname.startsWith(href + "/");
                      return (
                        <Link
                          key={href}
                          href={href}
                          className={cn(
                            "rounded-lg px-3 py-3.5 text-sm font-medium transition-colors",
                            brand === "fragments"
                              ? active
                                ? "bg-[#1a3d2e]/75 text-[#d9ffe8]"
                                : "text-[#c5f2d9] hover:bg-[#17352b]/55 hover:text-[#e8fff1] active:bg-[#1a3d2e]/65"
                              : active
                                ? "bg-[var(--wine)]/60 text-[var(--gold-bright)]"
                                : "text-[var(--parchment)] hover:bg-[var(--wine)]/40 hover:text-[var(--gold-bright)] active:bg-[var(--wine)]/60",
                          )}
                        >
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </nav>
        </>
      )}
    </>
  );
}
