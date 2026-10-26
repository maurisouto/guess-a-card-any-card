"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyStateWell } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import type {
  FragmentsDifficultyBreakdown,
  FragmentsModeBreakdown,
  FragmentsProfileCompletion,
  FragmentsProfileHighlights,
  FragmentsProfileResponse,
  FragmentsSetProgressRow,
} from "@/lib/fragments/types";
import { cn } from "@/lib/utils/cn";

function formatDuration(ms: number | null): string {
  if (ms == null) return "—";
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${min}:${String(rem).padStart(2, "0")}`;
}

function formatTotalRestoration(msStr: string | null): string {
  if (msStr == null || msStr === "") return "—";
  try {
    const ms = BigInt(msStr);
    const sec = ms / BigInt(1000);
    const h = sec / BigInt(3600);
    const m = (sec % BigInt(3600)) / BigInt(60);
    const s = sec % BigInt(60);
    if (h > BigInt(0)) return `${h.toString()}h ${m.toString()}m`;
    if (m > BigInt(0)) return `${m.toString()}m ${s.toString()}s`;
    return `${s.toString()}s`;
  } catch {
    return "—";
  }
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  if (diff < 0) return new Date(iso).toLocaleDateString();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

function formatModeLabel(mode: FragmentsProfileCompletion["puzzleMode"]): string {
  return mode === "fragments" ? "Fragments" : "Sliding";
}

function formatDifficultyLabel(d: FragmentsProfileCompletion["difficulty"]): string {
  if (d === "easy") return "Easy";
  if (d === "normal") return "Normal";
  return "Hard";
}

function emptyBreakdowns(): {
  modeBreakdown: FragmentsModeBreakdown;
  difficultyBreakdown: FragmentsDifficultyBreakdown;
} {
  const z = { completions: 0, averageTimeMs: null, averageMoves: null };
  return {
    modeBreakdown: { fragments: { ...z }, sliding: { ...z } },
    difficultyBreakdown: { easy: { ...z }, normal: { ...z }, hard: { ...z } },
  };
}

function emptyHighlights(): FragmentsProfileHighlights {
  return {
    fastestRestoration: null,
    lowestMoveRestoration: null,
    mostRestoredCard: null,
    rarestRestoredCard: null,
    latestRestoration: null,
  };
}

type FragmentsProfileViewProps = {
  data: FragmentsProfileResponse;
  isOwnProfile: boolean;
};

function StatCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-[#214537]/55 bg-[#0b1210]/55 px-3 py-2">
      <dt className="text-xs text-[#7aab92]">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums text-[#e8fff1]">{children}</dd>
    </div>
  );
}

function BreakdownColumn({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; b: { completions: number; averageTimeMs: string | null; averageMoves: string | null } }>;
}) {
  return (
    <div className="rounded-lg border border-[#214537]/40 bg-[#0b1210]/40 p-3">
      <p className="font-codex text-[10px] uppercase tracking-[0.14em] text-[#86efac]/90">{title}</p>
      <ul className="mt-2 space-y-2 text-xs text-[#c5f2d9]">
        {rows.map(({ label, b }) => (
          <li key={label} className="flex flex-col gap-0.5 border-b border-[#214537]/35 pb-2 last:border-0 last:pb-0">
            <span className="font-medium text-[#e8fff1]">{label}</span>
            <span className="text-[#9fc8b6]">
              {b.completions} restored
              {b.completions > 0 ? (
                <>
                  {" "}
                  · avg {formatDuration(b.averageTimeMs != null ? Number(b.averageTimeMs) : null)} · avg{" "}
                  {b.averageMoves != null ? Number(b.averageMoves).toFixed(1) : "—"} moves
                </>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HighlightTile({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-[#214537]/45 bg-[#081410]/55 p-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#7aab92]">{label}</p>
      <div className="mt-2 text-sm text-[#ddfeea]">{children}</div>
    </div>
  );
}

function CompletionMini({ c }: { c: FragmentsProfileCompletion }) {
  return (
    <div className="flex items-start gap-2">
      <div className="h-10 w-7 shrink-0 overflow-hidden rounded border border-[#214537]/50 bg-[#0b1210]">
        <img src={c.cardImageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium text-[#e8fff1]">{c.cardName}</p>
        <p className="text-xs text-[#9fc8b6]">
          {formatModeLabel(c.puzzleMode)} · {formatDifficultyLabel(c.difficulty)} · {formatDuration(c.timeMs)} ·{" "}
          {c.moves} moves
        </p>
      </div>
    </div>
  );
}

export function FragmentsProfileView({ data, isOwnProfile }: FragmentsProfileViewProps) {
  const s = data.summary;
  const hasRuns = s.puzzlesCompleted > 0;
  const publicHref = `/u/${encodeURIComponent(data.userId)}/puzzle`;
  const highlights = data.highlights ?? emptyHighlights();
  const breakdownFallback = emptyBreakdowns();
  const modeB = data.modeBreakdown ?? breakdownFallback.modeBreakdown;
  const diffB = data.difficultyBreakdown ?? breakdownFallback.difficultyBreakdown;
  const setProgress: FragmentsSetProgressRow[] = data.setProgress ?? [];

  return (
    <div className="space-y-6">
      <Panel
        variant="subtle"
        className="border-[#2f7f5f]/40 bg-[linear-gradient(165deg,rgba(15,31,26,0.92),rgba(11,18,16,0.88))] p-5"
      >
        <p className="font-codex text-xs uppercase tracking-[0.16em] text-[#86efac]">Fragments of Rathe</p>
        <h2 className="mt-2 font-codex text-2xl text-[#e8fff1]">Restoration archive</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#9fc8b6]">
          Your personal progression — restorations saved per run while signed in. Explore the{" "}
          <Link href="/puzzle/leaderboard" className="text-[#b6f5d2] underline underline-offset-2 hover:text-[#e8fff1]">
            Hall of records
          </Link>{" "}
          to see how others move through the same catalog, then return to{" "}
          <Link href="/puzzle" className="text-[#b6f5d2] underline underline-offset-2 hover:text-[#e8fff1]">
            restorations
          </Link>{" "}
          when you wish to play again.
        </p>
        {isOwnProfile ? (
          <p className="mt-3 text-xs text-[#8fbc9f]">
            Public link:{" "}
            <Link href={publicHref} className="underline underline-offset-2 hover:text-[#c5f2d9]">
              {publicHref}
            </Link>
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2 border-t border-[#214537]/45 pt-4">
          <Button size="sm" variant="outline" asChild className="border-[#2f7f5f]/50 text-[#c5f2d9]">
            <Link href="/puzzle">Return to restorations</Link>
          </Button>
          <Button size="sm" variant="outline" asChild className="border-[#2f7f5f]/50 text-[#c5f2d9]">
            <Link href="/puzzle/leaderboard">Hall of records</Link>
          </Button>
        </div>
      </Panel>

      <Panel
        variant="subtle"
        className="border-[#2f7f5f]/32 bg-[linear-gradient(170deg,rgba(15,31,26,0.78),rgba(11,18,16,0.82))] p-5"
      >
        {hasRuns ? (
          <>
            <h3 className="font-codex text-xs uppercase tracking-[0.14em] text-[#86efac]">Summary</h3>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-4">
              <StatCell label="Puzzles restored">{s.puzzlesCompleted}</StatCell>
              <StatCell label="Unique cards">{s.uniqueCardsRestored}</StatCell>
              <StatCell label="Total archive time">{formatTotalRestoration(s.totalRestorationTimeMs)}</StatCell>
              <StatCell label="Average time">
                {s.averageTimeMs != null ? formatDuration(Number(s.averageTimeMs)) : "—"}
              </StatCell>
              <StatCell label="Average moves">
                {s.averageMoves != null ? Number(s.averageMoves).toFixed(1) : "—"}
              </StatCell>
              <StatCell label="Best time">{formatDuration(s.bestTimeMs)}</StatCell>
              <StatCell label="Best moves">{s.bestMoves ?? "—"}</StatCell>
              <StatCell label="Last restoration">{formatRelative(s.lastCompletedAt)}</StatCell>
            </dl>
            {(s.lastRestoredCardName || s.lastRestoredSet) && (
              <p className="mt-4 border-t border-[#214537]/45 pt-3 text-xs text-[#9fc8b6]">
                Latest piece:{" "}
                <span className="font-medium text-[#ddfeea]">{s.lastRestoredCardName ?? "—"}</span>
                {s.lastRestoredSet ? (
                  <>
                    {" "}
                    <span className="text-[#7aab92]">·</span> {s.lastRestoredSet}
                  </>
                ) : null}
              </p>
            )}
          </>
        ) : (
          <EmptyStateWell
            title="No fragments restored yet."
            description={
              isOwnProfile
                ? "The archive awaits. Sign in before finishing a restoration so each piece is etched into your record — then explore the Hall of records to see the wider ledger."
                : "This reader has not saved any restorations yet."
            }
          >
            {isOwnProfile ? (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="primary" className="bg-[#1d5c40] hover:bg-[#24764d]" asChild>
                  <Link href="/puzzle">Return to restorations</Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/login">Sign in to preserve restorations</Link>
                </Button>
              </div>
            ) : null}
          </EmptyStateWell>
        )}
      </Panel>

      {hasRuns ? (
        <>
          <Panel
            variant="subtle"
            className="border-[#2f7f5f]/28 bg-[linear-gradient(170deg,rgba(15,31,26,0.72),rgba(11,18,16,0.8))] p-5"
          >
            <h3 className="font-codex text-xs uppercase tracking-[0.14em] text-[#86efac]">Restoration highlights</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <HighlightTile label="Fastest restoration">
                {highlights.fastestRestoration ? (
                  <CompletionMini c={highlights.fastestRestoration} />
                ) : (
                  <span className="text-[#9fc8b6]">—</span>
                )}
              </HighlightTile>
              <HighlightTile label="Fewest moves">
                {highlights.lowestMoveRestoration ? (
                  <CompletionMini c={highlights.lowestMoveRestoration} />
                ) : (
                  <span className="text-[#9fc8b6]">—</span>
                )}
              </HighlightTile>
              <HighlightTile label="Most revisited">
                {highlights.mostRestoredCard ? (
                  <div>
                    <p className="font-medium text-[#e8fff1]">{highlights.mostRestoredCard.cardName}</p>
                    <p className="text-xs text-[#9fc8b6]">
                      {highlights.mostRestoredCard.timesCompleted} restorations
                      {highlights.mostRestoredCard.bestTimeMs != null
                        ? ` · best ${formatDuration(highlights.mostRestoredCard.bestTimeMs)}`
                        : ""}
                    </p>
                  </div>
                ) : (
                  <span className="text-[#9fc8b6]">—</span>
                )}
              </HighlightTile>
              <HighlightTile label="Rarest in archive">
                {highlights.rarestRestoredCard ? (
                  <div className="flex items-start gap-2">
                    <div className="h-10 w-7 shrink-0 overflow-hidden rounded border border-[#214537]/50 bg-[#0b1210]">
                      <img
                        src={highlights.rarestRestoredCard.cardImageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[#e8fff1]">{highlights.rarestRestoredCard.cardName}</p>
                      <p className="text-xs text-[#9fc8b6]">
                        {[highlights.rarestRestoredCard.rarity, highlights.rarestRestoredCard.fabSet]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <span className="text-[#9fc8b6]">—</span>
                )}
              </HighlightTile>
              <HighlightTile label="Latest piece">
                {highlights.latestRestoration ? (
                  <CompletionMini c={highlights.latestRestoration} />
                ) : (
                  <span className="text-[#9fc8b6]">—</span>
                )}
              </HighlightTile>
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <BreakdownColumn
              title="By mode"
              rows={[
                { label: "Fragments", b: modeB.fragments },
                { label: "Sliding", b: modeB.sliding },
              ]}
            />
            <BreakdownColumn
              title="By difficulty"
              rows={[
                { label: "Easy", b: diffB.easy },
                { label: "Normal", b: diffB.normal },
                { label: "Hard", b: diffB.hard },
              ]}
            />
          </div>

          <Panel
            variant="subtle"
            className="border-[#2f7f5f]/26 bg-[linear-gradient(170deg,rgba(15,31,26,0.7),rgba(11,18,16,0.78))] p-5"
          >
            <h3 className="font-codex text-xs uppercase tracking-[0.14em] text-[#86efac]">Set restoration</h3>
            <p className="mt-1 text-xs text-[#8fbc9f]">
              Playable printings per release from the live catalog — a gentle map of what is still waiting in the stacks.
            </p>
            {setProgress.length === 0 ? (
              <p className="mt-4 text-sm text-[#9fc8b6]">Catalog index is not available — set progress will appear here once the server loads card data.</p>
            ) : (
              <ul className="mt-4 max-h-[320px] space-y-2 overflow-y-auto pr-1 text-sm">
                {setProgress.map((row) => (
                  <li
                    key={row.setName}
                    className={cn(
                      "flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-[#214537]/40 bg-[#0b1210]/45 px-3 py-2",
                      row.restoredUniqueCount === 0 ? "opacity-55" : "",
                    )}
                  >
                    <span className="font-medium text-[#ddfeea]">{row.setName}</span>
                    <span className="text-xs text-[#9fc8b6]">
                      {row.restoredUniqueCount} / {row.availableInCatalog} restored ·{" "}
                      <span className="tabular-nums text-[#b6f5d2]">{row.percentRestored.toFixed(1)}%</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {data.recentCompletions.length > 0 ? (
            <Panel
              variant="subtle"
              className="border-[#2f7f5f]/30 bg-[linear-gradient(170deg,rgba(15,31,26,0.75),rgba(11,18,16,0.82))] p-5"
            >
              <h3 className="font-codex text-xs uppercase tracking-[0.14em] text-[#86efac]">Recent activity</h3>
              <ul className="mt-3 space-y-2">
                {data.recentCompletions.slice(0, 12).map((run) => (
                  <li
                    key={run.runId}
                    className="flex gap-3 rounded-md border border-[#214537]/45 bg-[#0b1210]/45 px-3 py-2"
                  >
                    <div className="h-14 w-10 shrink-0 overflow-hidden rounded border border-[#214537]/50 bg-[#0b1210]">
                      <img src={run.cardImageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[#ddfeea]">{run.cardName}</p>
                      <p className="text-xs text-[#9fc8b6]">
                        {[run.fabSet, formatModeLabel(run.puzzleMode), formatDifficultyLabel(run.difficulty)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      <p className="mt-1 text-xs text-[#7aab92]">
                        {formatDuration(run.timeMs)} · {run.moves} moves · {formatRelative(run.completedAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
