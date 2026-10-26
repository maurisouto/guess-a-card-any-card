"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { LoginModal } from "@/components/auth/login-modal";
import {
  getBrandFromPathname,
  getProfilePathForBrand,
  getPublicProfilePathForBrand,
} from "@/lib/experience-brand";
import { cn } from "@/lib/utils/cn";

function displayLabel(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): string {
  const meta = user.user_metadata;
  const full =
    meta && typeof meta.full_name === "string"
      ? meta.full_name.trim()
      : meta && typeof meta.name === "string"
        ? meta.name.trim()
        : "";
  if (full) {
    return full;
  }
  return user.email?.split("@")[0]?.trim() || "Account";
}

function avatarUrl(user: {
  user_metadata?: Record<string, unknown>;
}): string | null {
  const meta = user.user_metadata;
  if (meta && typeof meta.avatar_url === "string" && meta.avatar_url.length > 0) {
    return meta.avatar_url;
  }
  if (meta && typeof meta.picture === "string" && meta.picture.length > 0) {
    return meta.picture;
  }
  return null;
}

export function SiteHeaderAuth() {
  const pathname = usePathname();
  const brand = getBrandFromPathname(pathname);
  const profileHref = getProfilePathForBrand(brand);
  const isCodex = brand === "codex";
  const isFragments = brand === "fragments";
  const { user, isLoading, isConfigured, signOut } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  if (isLoading) {
    return (
      <div
        className={cn(
          "h-10 w-10 shrink-0 rounded-full border",
          isCodex
            ? "border-[#60A5FA]/30 bg-[#121826]/65"
            : isFragments
              ? "border-[#2F7F5F]/40 bg-[#0F1F1A]/70"
            : "border-[var(--gold)]/25 bg-[var(--plum-mid)]/60",
        )}
        aria-hidden
      />
    );
  }

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setLoginOpen(true)}
          disabled={!isConfigured}
          className={cn(
            "rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors sm:text-sm",
            isConfigured
              ? isCodex
                ? "border border-[#60A5FA]/55 text-[#D8E7FF] hover:border-[#60A5FA]/85 hover:bg-[#1b2740]/55"
                : isFragments
                  ? "border border-[#4ADE80]/45 text-[#DDFEEA] hover:border-[#86EFAC]/75 hover:bg-[#17352b]/60"
                : "border border-[var(--gold)]/55 text-[var(--gold-bright)] hover:border-[var(--gold-bright)]/80 hover:bg-[var(--wine)]/40"
              : isCodex
                ? "cursor-not-allowed border border-[#24324f]/90 text-[#8da1c8]"
                : isFragments
                  ? "cursor-not-allowed border border-[#1d3a30]/90 text-[#86a998]"
                : "cursor-not-allowed border border-[var(--wine-deep)]/80 text-[var(--mist)]",
          )}
        >
          Sign in
        </button>
        <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} brand={brand} />
      </>
    );
  }

  const label = displayLabel(user);
  const url = avatarUrl(user);
  const initial = label.slice(0, 1).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 text-sm font-semibold transition-[box-shadow,transform] hover:scale-[1.03]",
          isCodex
            ? "border-[#60A5FA]/45 bg-[#121826]/85 text-[#DDEBFF] shadow-[0_0_16px_rgba(59,130,246,0.2)] hover:shadow-[0_0_24px_rgba(96,165,250,0.35)]"
            : isFragments
              ? "border-[#4ADE80]/45 bg-[#0F1F1A]/85 text-[#DDFEEA] shadow-[0_0_14px_rgba(74,222,128,0.18)] hover:shadow-[0_0_22px_rgba(134,239,172,0.3)]"
            : "border-[var(--gold)]/45 bg-[var(--plum-mid)]/80 text-[var(--gold-bright)] shadow-[0_0_16px_rgba(201,162,39,0.2)] hover:shadow-[0_0_24px_rgba(201,162,39,0.35)]",
        )}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label={`Account menu for ${label}`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element -- provider avatar URLs are dynamic hosts
          <img
            src={url}
            alt=""
            width={40}
            height={40}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span aria-hidden>{initial}</span>
        )}
      </button>
      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div
            role="menu"
            className={cn(
              "absolute right-0 z-40 mt-2 min-w-[11rem] rounded-md py-1 shadow-lg backdrop-blur-md",
              isCodex
                ? "border border-[#60A5FA]/28 bg-[#0B0D12]/95"
                : isFragments
                  ? "border border-[#2F7F5F]/36 bg-[#0B1210]/95"
                : "border border-[var(--wine-deep)]/90 bg-[var(--void)]/95",
            )}
          >
            <p
              className={cn(
                "border-b px-3 py-2 text-xs",
                isCodex
                  ? "border-[#60A5FA]/18 text-[#9fb4dd]"
                  : isFragments
                    ? "border-[#2F7F5F]/25 text-[#97c8b0]"
                    : "border-[var(--wine-deep)]/60 text-[var(--mist)]",
              )}
            >
              <span
                className={cn(
                  "block truncate font-medium",
                  isCodex
                    ? "text-[#E6EEFF]"
                    : isFragments
                      ? "text-[#E7FFF0]"
                      : "text-[var(--parchment)]",
                )}
              >
                {label}
              </span>
            </p>
            <Link
              href={profileHref}
              role="menuitem"
              className={cn(
                "block px-3 py-2 text-sm",
                isCodex
                  ? "text-[#E6EEFF] hover:bg-[#1a2338]/70"
                  : isFragments
                    ? "text-[#E7FFF0] hover:bg-[#17352b]/70"
                    : "text-[var(--parchment)] hover:bg-[var(--wine)]/50",
              )}
              onClick={() => setMenuOpen(false)}
            >
              {isFragments ? "Your archive" : "Profile"}
            </Link>
            <Link
              href={getPublicProfilePathForBrand(user.id, brand)}
              role="menuitem"
              className={cn(
                "block px-3 py-2 text-sm",
                isCodex
                  ? "text-[#AFC3EC] hover:bg-[#1a2338]/70"
                  : isFragments
                    ? "text-[#BDE9CF] hover:bg-[#17352b]/70"
                    : "text-[var(--mist)] hover:bg-[var(--wine)]/50",
              )}
              onClick={() => setMenuOpen(false)}
            >
              Public link
            </Link>
            <button
              type="button"
              role="menuitem"
              className={cn(
                "w-full px-3 py-2 text-left text-sm",
                isCodex
                  ? "text-[#E6EEFF] hover:bg-[#1a2338]/70"
                  : isFragments
                    ? "text-[#E7FFF0] hover:bg-[#17352b]/70"
                    : "text-[var(--parchment)] hover:bg-[var(--wine)]/50",
              )}
              onClick={async () => {
                setMenuOpen(false);
                await signOut();
              }}
            >
              Sign out
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
