"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { PublicProfileResponse } from "@/lib/profile/types";
import { Button } from "@/components/ui/button";
import { EmptyStateWell } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { siteConfig } from "@/lib/config/site";
import { getPublicSiteUrl } from "@/lib/config/site-url";
import type { Brand } from "@/lib/experience-brand";
import { getPublicProfilePathForBrand } from "@/lib/experience-brand";
import { fetchPublicFragmentsProfile } from "@/lib/fragments/fragments-api";
import type { FragmentsProfileResponse } from "@/lib/fragments/types";
import { shareContent } from "@/lib/share/share-content";
import { cn } from "@/lib/utils/cn";

function formatMode(m: string): string {
  if (m === "SINGLE") return "Single";
  if (m === "CHALLENGE") return "Challenge";
  if (m === "COOP") return "Co-op";
  if (m === "COMPETITIVE") return "Multiplayer";
  return m;
}

function formatTimeMs(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function formatClock(ms: number | null): string {
  if (ms == null) return "—";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function fragmentsFavoriteMode(fragmentsCount: number, slidingCount: number): string {
  if (fragmentsCount > slidingCount) return "Fragments";
  if (slidingCount > fragmentsCount) return "Sliding";
  return "Balanced";
}

/** Human-friendly “last played” for Codex overview tiles. */
function formatRelativeLastPlayed(iso: string | null): string {
  if (iso == null) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffMs = Date.now() - then;
  if (diffMs < 0) return new Date(iso).toLocaleDateString();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

type ProfileViewProps = {
  data: PublicProfileResponse;
  showEmail?: boolean;
  showPublicLink?: boolean;
  /** "Share profile" (signed-in /profile). */
  showShare?: boolean;
  /** `/profile` (true) vs public `/u/...` (false) — copy and CTAs. */
  isOwnProfile?: boolean;
  brand?: Brand;
  scope?: "global" | "guess";
};

export function ProfileView({
  data,
  showEmail,
  showPublicLink,
  showShare,
  isOwnProfile = true,
  brand = "guess",
  scope = "global",
}: ProfileViewProps) {
  const { stats } = data;
  const hasNoGames = stats.gamesPlayed === 0;
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const isCodex = brand === "codex";
  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;
  const publicPath = getPublicProfilePathForBrand(data.id, scope === "global" ? "codex" : "guess");
  const guessDetailHref = isOwnProfile ? "/guess/profile" : `/u/${encodeURIComponent(data.id)}/guess`;
  const bestAttemptsLabel = stats.bestAttemptsRecord != null ? `${stats.bestAttemptsRecord} attempts` : "—";
  const fragmentsDetailHref = isOwnProfile
    ? "/puzzle/profile"
    : `/u/${encodeURIComponent(data.id)}/puzzle`;
  const [fragmentsData, setFragmentsData] = useState<FragmentsProfileResponse | null>(null);
  const [fragmentsLoaded, setFragmentsLoaded] = useState(false);

  useEffect(() => {
    if (scope !== "global") return;
    void fetchPublicFragmentsProfile(data.id)
      .then((d) => setFragmentsData(d))
      .catch(() => setFragmentsData(null))
      .finally(() => setFragmentsLoaded(true));
  }, [data.id, scope]);

  /** Codex global profile: mini-games and their profile pages open in a new tab. */
  const codexExperienceLinkProps =
    scope === "global"
      ? ({ target: "_blank" as const, rel: "noopener noreferrer" as const })
      : null;

  const sectionTitleClass = isCodex
    ? "font-codex text-sm font-semibold uppercase tracking-[0.14em] text-[#AFC3EC]"
    : "font-display text-sm font-semibold uppercase tracking-[0.14em] text-[var(--parchment-dim)]";
  const rowClass = isCodex
    ? "flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-[#60A5FA]/20 bg-[#0B0D12]/45 px-3 py-2 text-sm"
    : "flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-[var(--wine-deep)]/50 bg-[var(--void)]/40 px-3 py-2 text-sm";

  const onShareProfile = useCallback(() => {
    setShareFeedback(null);
    const origin =
      typeof window !== "undefined" ? window.location.origin : getPublicSiteUrl();
    const path = publicPath;
    const url = `${origin.replace(/\/$/, "")}${path}`;
    const text = `Check out my Flesh and Blood stats 🔥\n\n${siteConfig.shortName}`;

    void shareContent({
      title: data.displayName,
      text,
      url,
      onFeedback: (m) => {
        setShareFeedback(m);
        window.setTimeout(() => setShareFeedback(null), 3000);
      },
    });
  }, [data.displayName, publicPath]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
        <div
          className={cn(
            "flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 text-2xl font-semibold",
            isCodex
              ? "border-[#60A5FA]/42 bg-[#121826]/80 text-[#DDEBFF]"
              : "border-[var(--gold)]/50 bg-[var(--plum-mid)]/80 text-[var(--gold-bright)]",
          )}
        >
          {data.avatarUrl ? (
            <img
              src={data.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span aria-hidden>{data.displayName.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h2
            className={cn(
              "text-xl font-semibold tracking-wide sm:text-2xl",
              isCodex ? "font-codex text-[#E8F0FF]" : "font-display text-[var(--parchment)]",
            )}
          >
            {data.displayName}
          </h2>
          {showEmail && data.email ? (
            <p className={cn("mt-1 text-sm", isCodex ? "text-[#9FB5DC]" : "text-[var(--mist)]")}>
              {data.email}
            </p>
          ) : null}
          <p className={cn("mt-1 text-xs", isCodex ? "text-[#B8CAEA]" : "text-[var(--parchment-dim)]")}>
            Member since{" "}
            {new Date(data.memberSince).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
          {data.bio ? (
            <p
              className={cn(
                "mt-3 text-sm leading-relaxed",
                isCodex ? "text-[#AFC3EC]" : "text-[var(--mist)]",
              )}
            >
              {data.bio}
            </p>
          ) : null}
          {showPublicLink ? (
            <p className="mt-2 text-sm">
              <Link
                href={publicPath}
                className={cn(
                  "underline-offset-2 hover:underline",
                  isCodex ? "text-[#9BC2FF]" : "text-[var(--gold-bright)]",
                )}
              >
                Public profile link
              </Link>
            </p>
          ) : null}
          {showShare ? (
            <div className="mt-4 flex min-w-0 flex-col items-center gap-1 sm:items-start">
              <Button type="button" variant="outline" onClick={() => void onShareProfile()}>
                Share profile
              </Button>
              {shareFeedback ? (
                <span
                  className={cn("text-xs", isCodex ? "text-[#9BC2FF]" : "text-[var(--gold-dim)]")}
                  role="status"
                  aria-live="polite"
                >
                  {shareFeedback}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {scope === "global" ? (
        <section className="space-y-3">
          <h3 className={sectionTitleClass}>Experiences</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Panel
              variant="subtle"
              className={cn(
                "flex flex-col gap-3 p-4 sm:p-5",
                isCodex ? "border-[#60A5FA]/22 bg-[#0B0D12]/5" : "border-[var(--wine-deep)]/55",
              )}
            >
              <div>
                <p
                  className={cn(
                    "font-codex text-base font-semibold tracking-[0.06em] sm:text-lg",
                    isCodex ? "text-[#E8F0FF]" : "text-[var(--gold-bright)]",
                  )}
                >
                  Guess the Card
                </p>
                <p className={cn("mt-1 text-xs", isCodex ? "text-[#8FA7CF]" : "text-[var(--mist)]")}>
                  Mini-game · readings across all modes
                </p>
              </div>

              {hasNoGames ? (
                <EmptyStateWell
                  compact
                  title="No Guess readings yet"
                  description={
                    isOwnProfile
                      ? "Your Codex overview will summarize Guess once you finish a run. Open the Guess profile for detail, or start playing."
                      : "This reader has no recorded Guess games yet — their overview will fill in after they play."
                  }
                >
                  {isOwnProfile ? (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/guess" {...(codexExperienceLinkProps ?? {})}>
                          Enter Guess the Card
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={guessDetailHref} {...(codexExperienceLinkProps ?? {})}>
                          View Guess profile
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={guessDetailHref} {...(codexExperienceLinkProps ?? {})}>
                        View Guess profile
                      </Link>
                    </Button>
                  )}
                </EmptyStateWell>
              ) : (
                <>
                  <div className={cn("space-y-2 text-sm leading-relaxed", isCodex ? "text-[#DDEBFF]" : "text-[var(--parchment)]")}>
                    <p>
                      <span className={cn("font-medium", isCodex ? "text-[#B8D4FF]" : "text-[var(--parchment-dim)]")}>
                        {stats.gamesPlayed}
                      </span>{" "}
                      games played
                    </p>
                    <p>
                      <span className={cn("font-medium", isCodex ? "text-[#B8D4FF]" : "text-[var(--parchment-dim)]")}>
                        {stats.gamesWon}
                      </span>{" "}
                      wins ·{" "}
                      <span className={cn("font-medium", isCodex ? "text-[#B8D4FF]" : "text-[var(--parchment-dim)]")}>
                        {winRate}%
                      </span>{" "}
                      win rate
                    </p>
                    <p>
                      Best result:{" "}
                      <span className={cn("font-medium", isCodex ? "text-[#B8D4FF]" : "text-[var(--parchment-dim)]")}>
                        {bestAttemptsLabel}
                      </span>
                    </p>
                    <p className={cn("text-xs sm:text-sm", isCodex ? "text-[#AFC3EC]" : "text-[var(--mist)]")}>
                      Last played:{" "}
                      <span className="font-medium text-[inherit]">{formatRelativeLastPlayed(stats.lastPlayedAt)}</span>
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="mt-1 w-full sm:w-auto" asChild>
                    <Link href={guessDetailHref} {...(codexExperienceLinkProps ?? {})}>
                      View Guess profile
                    </Link>
                  </Button>
                </>
              )}
            </Panel>

            <Panel
              variant="subtle"
              className={cn(
                "flex flex-col gap-3 p-4 sm:p-5",
                isCodex ? "border-[#60A5FA]/22 bg-[#0B0D12]/5" : "border-[var(--wine-deep)]/55",
              )}
            >
              <div>
                <p
                  className={cn(
                    "font-codex text-base font-semibold tracking-[0.06em] sm:text-lg",
                    isCodex ? "text-[#E8F0FF]" : "text-[var(--gold-bright)]",
                  )}
                >
                  Fragments of Rathe
                </p>
                <p className={cn("mt-1 text-xs", isCodex ? "text-[#8FA7CF]" : "text-[var(--mist)]")}>
                  Puzzle · fragment and sliding runs
                </p>
              </div>
              {!fragmentsLoaded ? (
                <p className={cn("text-sm", isCodex ? "text-[#9FB5DC]" : "text-[var(--mist)]")}>
                  Loading Fragments stats…
                </p>
              ) : !fragmentsData || fragmentsData.summary.puzzlesCompleted === 0 ? (
                <EmptyStateWell
                  compact
                  title="No fragments restored yet."
                  description={
                    isOwnProfile
                      ? "Begin your first restoration while signed in — detailed progress lives on your Fragments profile."
                      : "This reader has no saved Fragments runs yet."
                  }
                >
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/puzzle" {...(codexExperienceLinkProps ?? {})}>
                      Start puzzle
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={fragmentsDetailHref} {...(codexExperienceLinkProps ?? {})}>
                      {isOwnProfile ? "Fragments profile" : "View profile"}
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/puzzle/leaderboard" {...(codexExperienceLinkProps ?? {})}>
                      Hall of records
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/puzzle" {...(codexExperienceLinkProps ?? {})}>
                      Return to restorations
                    </Link>
                  </Button>
                </EmptyStateWell>
              ) : (
                <>
                  <div
                    className={cn(
                      "space-y-2 text-sm leading-relaxed",
                      isCodex ? "text-[#DDEBFF]" : "text-[var(--parchment)]",
                    )}
                  >
                    <p>
                      <span
                        className={cn(
                          "font-medium",
                          isCodex ? "text-[#B8D4FF]" : "text-[var(--parchment-dim)]",
                        )}
                      >
                        {fragmentsData.summary.puzzlesCompleted}
                      </span>{" "}
                      puzzles ·{" "}
                      <span
                        className={cn(
                          "font-medium",
                          isCodex ? "text-[#B8D4FF]" : "text-[var(--parchment-dim)]",
                        )}
                      >
                        {fragmentsData.summary.uniqueCardsRestored ?? "—"}
                      </span>{" "}
                      unique cards
                    </p>
                    <p>
                      Favored mode:{" "}
                      <span
                        className={cn(
                          "font-medium",
                          isCodex ? "text-[#B8D4FF]" : "text-[var(--parchment-dim)]",
                        )}
                      >
                        {fragmentsFavoriteMode(
                          fragmentsData.summary.fragmentsCount,
                          fragmentsData.summary.slidingCount,
                        )}
                      </span>
                    </p>
                    <p>
                      Best time:{" "}
                      <span
                        className={cn(
                          "font-medium",
                          isCodex ? "text-[#B8D4FF]" : "text-[var(--parchment-dim)]",
                        )}
                      >
                        {formatClock(fragmentsData.summary.bestTimeMs)}
                      </span>
                    </p>
                    <p>
                      Best moves:{" "}
                      <span
                        className={cn(
                          "font-medium",
                          isCodex ? "text-[#B8D4FF]" : "text-[var(--parchment-dim)]",
                        )}
                      >
                        {fragmentsData.summary.bestMoves ?? "—"}
                      </span>
                    </p>
                    <p className={cn("text-xs sm:text-sm", isCodex ? "text-[#AFC3EC]" : "text-[var(--mist)]")}>
                      Latest piece:{" "}
                      <span className="font-medium text-[inherit]">
                        {fragmentsData.highlights?.latestRestoration?.cardName ??
                          fragmentsData.recentCompletions[0]?.cardName ??
                          fragmentsData.summary.lastRestoredCardName ??
                          "—"}
                      </span>
                    </p>
                    <p className={cn("text-xs sm:text-sm", isCodex ? "text-[#AFC3EC]" : "text-[var(--mist)]")}>
                      Last completed:{" "}
                      <span className="font-medium text-[inherit]">
                        {formatRelativeLastPlayed(fragmentsData.summary.lastCompletedAt)}
                      </span>
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="mt-1 w-full sm:mt-0 sm:w-auto" asChild>
                    <Link href={fragmentsDetailHref} {...(codexExperienceLinkProps ?? {})}>
                      {isOwnProfile ? "Open Fragments profile" : "View Fragments profile"}
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="mt-1 w-full sm:mt-0 sm:w-auto" asChild>
                    <Link href="/puzzle/leaderboard" {...(codexExperienceLinkProps ?? {})}>
                      Hall of records
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" className="mt-1 w-full sm:mt-0 sm:w-auto" asChild>
                    <Link href="/puzzle" {...(codexExperienceLinkProps ?? {})}>
                      Return to restorations
                    </Link>
                  </Button>
                </>
              )}
            </Panel>
          </div>
        </section>
      ) : (
        <>
          <section className="space-y-2">
            <h3 className={sectionTitleClass}>Guess summary</h3>
            {hasNoGames ? (
              <EmptyStateWell
                title="No games in the book yet"
                description={
                  isOwnProfile
                    ? "The tally stays empty until you finish a reading. Start a solitary run, send a challenge, or join a circle — a few completed games will start filling wins, records, and this panel."
                    : "This player hasn’t finished a recorded game yet, so there’s no score to show. Check back after they play."
                }
              >
                {isOwnProfile ? (
                  <>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/single">Start a reading</Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/challenge">Send a challenge</Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/coop">Play co-op</Link>
                    </Button>
                  </>
                ) : null}
              </EmptyStateWell>
            ) : (
              <Panel variant="textured" className="border-[var(--gold)]/12 p-4 sm:p-5">
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-[var(--mist)]">Games played</dt>
                    <dd className="text-lg font-semibold text-[var(--parchment)]">{stats.gamesPlayed}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--mist)]">Won</dt>
                    <dd className="text-lg font-semibold text-[var(--gold-bright)]">{stats.gamesWon}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--mist)]">Win rate</dt>
                    <dd className="text-lg font-semibold text-[var(--parchment)]">{winRate}%</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--mist)]">Avg attempts (wins)</dt>
                    <dd className="text-lg font-semibold text-[var(--parchment)]">
                      {stats.averageAttemptsToWin ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--mist)]">Best attempts</dt>
                    <dd className="text-lg font-semibold text-[var(--parchment)]">
                      {stats.bestAttemptsRecord ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--mist)]">Best time (win)</dt>
                    <dd className="text-lg font-semibold text-[var(--parchment)]">
                      {formatTimeMs(stats.bestTimeRecordMs)}
                    </dd>
                  </div>
                  {stats.lastPlayedAt ? (
                    <div className="col-span-2 sm:col-span-3">
                      <dt className="text-xs text-[var(--mist)]">Last reading</dt>
                      <dd className="text-sm text-[var(--parchment)]">
                        {new Date(stats.lastPlayedAt).toLocaleString()}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </Panel>
            )}
          </section>

          <section className="space-y-2">
            <h3 className={sectionTitleClass}>Recent games</h3>
            {data.recentGames.length > 0 ? (
              <ul className="space-y-2">
                {data.recentGames.map((g) => (
                  <li key={g.gameId} className={rowClass}>
                    <span className="font-medium text-[var(--parchment)]">{g.cardName}</span>
                    <span className="text-xs text-[var(--mist)]">
                      {formatMode(g.mode)} · {g.didWin ? "Win" : "Loss"} ·{" "}
                      {g.finishedAt ? new Date(g.finishedAt).toLocaleDateString() : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyStateWell
                compact
                title={hasNoGames ? "The trail starts empty" : "No recent games listed"}
                description={
                  hasNoGames
                    ? isOwnProfile
                      ? "Finished games will be listed here with card name, mode, and win or loss — your storyboard after the veil lifts."
                      : "Their most recent games will show here once they’ve completed one."
                    : "The archive is catching up, or the last run was a while ago."
                }
              />
            )}
          </section>

          <section className="space-y-2">
            <h3 className={sectionTitleClass}>Recent challenges (hosted)</h3>
            {data.recentChallengesHosted.length > 0 ? (
              <ul className="space-y-2">
                {data.recentChallengesHosted.map((c) => (
                  <li key={c.challengeId} className={rowClass}>
                    <span className="font-medium text-[var(--parchment)]">{c.cardName}</span>
                    <span className="text-xs text-[var(--mist)]">
                      {c.status}
                      {c.outcome ? ` · ${c.outcome}` : ""} · {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyStateWell
                compact
                title="No challenges in view"
                description={
                  isOwnProfile
                    ? "When you create a challenge link, those duels are listed here so you can see what you’ve put into play."
                    : "They haven’t hosted a challenge that appears in this list yet (or it’s from before we started tracking here)."
                }
              >
                {isOwnProfile ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/challenge">Open challenges</Link>
                  </Button>
                ) : null}
              </EmptyStateWell>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export function ProfileSignInCta({
  className,
  brand = "guess",
}: {
  className?: string;
  brand?: Brand;
}) {
  const isCodex = brand === "codex";
  const guestPlayHref = brand === "fragments" ? "/puzzle" : "/single";
  return (
    <div className={cn("text-center", className)}>
      <p className={cn("text-sm", isCodex ? "text-[#AFC3EC]" : "text-[var(--mist)]")}>
        Sign in to see your name, reading tally, and history on your profile.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <Link
          href="/login"
          className={cn(
            "rounded-md border px-4 py-2 text-sm font-semibold transition-colors",
            isCodex
              ? "border-[#60A5FA]/55 bg-[#121826]/90 text-[#DDEBFF] hover:border-[#60A5FA]/85"
              : "border-[var(--gold)]/55 bg-[var(--plum-mid)]/90 text-[var(--gold-bright)] hover:border-[var(--gold-bright)]/80",
          )}
        >
          Sign in
        </Link>
        <Link
          href={guestPlayHref}
          className={cn(
            "rounded-md px-4 py-2 text-sm",
            isCodex ? "text-[#AFC3EC] hover:text-[#E8F0FF]" : "text-[var(--mist)] hover:text-[var(--parchment)]",
          )}
        >
          Play as guest
        </Link>
      </div>
    </div>
  );
}
