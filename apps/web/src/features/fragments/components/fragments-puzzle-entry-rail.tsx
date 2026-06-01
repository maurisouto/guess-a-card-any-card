"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { fetchFragmentsProfileMe } from "@/lib/fragments/fragments-api";
import type { FragmentsProfileResponse } from "@/lib/fragments/types";

/**
 * Setup-phase entry rail: journey copy, guest guidance, light signed-in stats, cross-links.
 * Keeps the primary “Start puzzle” CTA in {@link FragmentsSetupPanel}.
 */
export function FragmentsPuzzleEntryRail() {
  const { user, isLoading: authLoading, isConfigured } = useAuth();
  const [profile, setProfile] = useState<FragmentsProfileResponse | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileErr, setProfileErr] = useState(false);

  useEffect(() => {
    if (!isConfigured || authLoading || !user) {
      setProfile(null);
      setProfileErr(false);
      return;
    }
    setProfileLoading(true);
    setProfileErr(false);
    void fetchFragmentsProfileMe()
      .then((d) => setProfile(d))
      .catch(() => {
        setProfile(null);
        setProfileErr(true);
      })
      .finally(() => setProfileLoading(false));
  }, [user, authLoading, isConfigured]);

  const summary = profile?.summary;
  const hasArchive = (summary?.puzzlesCompleted ?? 0) > 0;

  let journeyLine: string | null = null;
  if (!isConfigured) {
    journeyLine = "Auth is not configured in this build — play locally, but restorations will not sync.";
  } else if (authLoading) {
    journeyLine = null;
  } else if (!user) {
    journeyLine =
      "Sign in to preserve your restorations in the archive. Guests may play freely; only signed-in runs are etched into your record.";
  } else if (profileLoading) {
    journeyLine = "Gathering your archive…";
  } else if (profileErr) {
    journeyLine = "Could not load your archive preview — your profile may still open from the menu.";
  } else if (!hasArchive) {
    journeyLine = "Restore your first fragment while signed in — each completion adds a line to your personal archive.";
  } else {
    const n = summary?.uniqueCardsRestored ?? 0;
    const lastName = summary?.lastRestoredCardName;
    const lastSet = summary?.lastRestoredSet;
    const tail =
      lastName != null
        ? ` Last restoration: ${lastName}${lastSet ? ` · ${lastSet}` : ""}.`
        : "";
    journeyLine = `Continue your restoration journey — ${n} unique cards restored across the catalog.${tail}`;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8fbc9f] sm:text-xs">
        <Link
          href="/"
          className="inline-flex items-baseline gap-1 py-1 font-codex uppercase tracking-[0.14em] text-[#86efac]/85 underline-offset-[3px] hover:text-[#c5f2d9] hover:underline"
        >
          <span aria-hidden>←</span>
          Codex hub
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
          <Link href="/puzzle/leaderboard" className="hover:text-[#c5f2d9] hover:underline">
            Hall of records
          </Link>
          {user ? (
            <Link href="/puzzle/profile" className="hover:text-[#c5f2d9] hover:underline">
              Your archive
            </Link>
          ) : (
            <Link href="/login" className="hover:text-[#c5f2d9] hover:underline">
              Sign in
            </Link>
          )}
        </div>
      </div>

      {journeyLine ? (
        <Panel
          variant="subtle"
          className="border-[#2f7f5f]/22 bg-[linear-gradient(165deg,rgba(15,31,26,0.55),rgba(11,18,16,0.62))] px-4 py-3"
        >
          <p className="text-xs leading-relaxed text-[#a4d3bc] sm:text-sm">{journeyLine}</p>
          {!user && isConfigured && !authLoading ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" asChild className="border-[#2f7f5f]/50 text-[#c5f2d9]">
                <Link href="/login">Sign in to save restorations</Link>
              </Button>
            </div>
          ) : null}
        </Panel>
      ) : null}
    </div>
  );
}
