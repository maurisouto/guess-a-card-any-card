"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-context";
import { SiteHeaderAuth } from "@/components/auth/site-header-auth";
import { FragmentsLogo } from "@/components/brand/fragments-logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { cn } from "@/lib/utils/cn";

type FragmentsNavItem = {
  href: string;
  label: string;
  match: (path: string) => boolean;
  signedInOnly?: boolean;
};

const NAV: FragmentsNavItem[] = [
  { href: "/", label: "Codex", match: (p) => p === "/" },
  { href: "/puzzle", label: "Play", match: (p) => p === "/puzzle" },
  {
    href: "/puzzle/leaderboard",
    label: "Hall of records",
    match: (p) => p.startsWith("/puzzle/leaderboard"),
  },
  {
    href: "/puzzle/profile",
    label: "Your archive",
    match: (p) => p.startsWith("/puzzle/profile"),
    signedInOnly: true,
  },
];

function NavLinks({
  items,
  pathname,
  className,
}: {
  items: readonly FragmentsNavItem[];
  pathname: string;
  className?: string;
}) {
  return (
    <nav aria-label="Fragments" className={cn("flex flex-wrap items-center gap-x-1 gap-y-1 sm:gap-x-2", className)}>
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "rounded-md px-2 py-1.5 font-codex text-[10px] font-medium uppercase tracking-[0.12em] transition-colors sm:px-2.5 sm:text-[11px]",
            item.match(pathname)
              ? "bg-[#17352b]/75 text-[#d9ffe8]"
              : "text-[#86efac]/85 hover:bg-[#0f1f1a]/65 hover:text-[#c5f2d9]",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** Fragments-specific title bar for `/puzzle` — archival, discoverable, not Guess-chrome. */
export function FragmentsHeader() {
  const pathname = usePathname() ?? "";
  const { user } = useAuth();
  const items = NAV.filter((item) => !item.signedInOnly || user);

  return (
    <header className="relative z-20 border-b border-[#2F7F5F]/40 bg-[linear-gradient(180deg,rgba(11,18,16,0.96)_0%,rgba(15,31,26,0.94)_74%,rgba(11,18,16,0.96)_100%)] shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-md">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#4ADE80]/45 to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-full w-[min(42rem,95%)] -translate-x-1/2 bg-[radial-gradient(circle_at_center,rgba(74,222,128,0.14),transparent_64%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-none sm:gap-4">
            <FragmentsLogo
              placement="header"
              href="/puzzle"
              className="drop-shadow-[0_0_14px_rgba(74,222,128,0.22)]"
            />
            <NavLinks items={items} pathname={pathname} className="hidden min-w-0 md:flex md:flex-1 md:justify-center" />
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="lg:hidden">
              <MobileNav />
            </div>
            <SiteHeaderAuth />
          </div>
        </div>

        <NavLinks items={items} pathname={pathname} className="mt-3 border-t border-[#214537]/45 pt-2.5 md:hidden" />
      </div>
    </header>
  );
}
