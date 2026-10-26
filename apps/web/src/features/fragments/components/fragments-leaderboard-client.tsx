"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { fetchFragmentsLeaderboard } from "@/lib/fragments/fragments-api";
import type {
  FragmentsLeaderboardCategory,
  FragmentsLeaderboardDifficultyFilter,
  FragmentsLeaderboardEntry,
  FragmentsLeaderboardModeFilter,
} from "@/lib/fragments/types";
import { cn } from "@/lib/utils/cn";

const CATEGORIES: { id: FragmentsLeaderboardCategory; label: string; blurb: string }[] = [
  {
    id: "fastest",
    label: "Fastest restorations",
    blurb: "Honored individual runs — lowest time, then fewest moves, then earliest seal.",
  },
  {
    id: "fewest_moves",
    label: "Fewest moves",
    blurb: "Efficiency over speed — lowest move count, then time, then earliest seal.",
  },
  {
    id: "most_restorations",
    label: "Most restorations",
    blurb: "Steady archivists ranked by total qualifying runs in the chosen veil.",
  },
  {
    id: "most_unique_cards",
    label: "Most unique cards",
    blurb: "Breadth of collection — distinct catalog printings touched at least once.",
  },
];

const MODE_OPTIONS: { id: FragmentsLeaderboardModeFilter; label: string }[] = [
  { id: "all", label: "All modes" },
  { id: "fragments", label: "Fragment puzzle" },
  { id: "sliding", label: "Sliding puzzle" },
];

const DIFF_OPTIONS: { id: FragmentsLeaderboardDifficultyFilter; label: string }[] = [
  { id: "all", label: "All difficulties" },
  { id: "easy", label: "Easy" },
  { id: "normal", label: "Normal" },
  { id: "hard", label: "Hard" },
];

function formatClock(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "—";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  if (diff < 0) return new Date(iso).toLocaleDateString();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatPrimaryValue(
  category: FragmentsLeaderboardCategory,
  e: FragmentsLeaderboardEntry,
): string {
  if (category === "fastest") return formatClock(e.value);
  if (category === "fewest_moves") return `${e.value} moves`;
  return `${e.value}`;
}

function entryKey(e: FragmentsLeaderboardEntry, category: FragmentsLeaderboardCategory): string {
  return `${category}-${e.rank}-${e.userId}-${e.value}-${e.completedAt ?? ""}-${e.cardName ?? ""}`;
}

export function FragmentsLeaderboardClient() {
  const [category, setCategory] = useState<FragmentsLeaderboardCategory>("fastest");
  const [mode, setMode] = useState<FragmentsLeaderboardModeFilter>("all");
  const [difficulty, setDifficulty] = useState<FragmentsLeaderboardDifficultyFilter>("all");
  const [entries, setEntries] = useState<FragmentsLeaderboardEntry[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const limit = 40;

  const load = useCallback(
    async (nextOffset: number, append: boolean) => {
      if (append) setLoadingMore(true);
      else setLoading(true);
      setErr(null);
      try {
        const data = await fetchFragmentsLeaderboard({
          category,
          mode,
          difficulty,
          limit,
          offset: nextOffset,
        });
        setHasMore(data.hasMore);
        setOffset(nextOffset);
        if (append) {
          setEntries((prev) => [...prev, ...data.entries]);
        } else {
          setEntries(data.entries);
        }
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : "Could not load hall.");
        if (!append) setEntries([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [category, mode, difficulty],
  );

  useEffect(() => {
    void load(0, false);
  }, [load]);

  const catMeta = useMemo(() => CATEGORIES.find((c) => c.id === category)!, [category]);

  return (
    <div className="space-y-6">
      <header className="space-y-2 border-b border-[#214537]/50 pb-6">
        <p className="font-codex text-xs uppercase tracking-[0.18em] text-[#86efac]">Fragments of Rathe</p>
        <h1 className="font-codex text-2xl text-[#e8fff1] sm:text-3xl">Hall of records</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[#9fc8b6]">
          A quiet ranking hall for restoration mastery — no ladders, no seasons. Runs are saved as submitted; very
          short or invalid rows are filtered for readability only.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button size="sm" variant="outline" asChild className="border-[#2f7f5f]/50 text-[#c5f2d9]">
            <Link href="/puzzle">Return to restorations</Link>
          </Button>
          <Button size="sm" variant="ghost" asChild className="text-[#9fc8b6] hover:text-[#e8fff1]">
            <Link href="/puzzle/profile">Your archive</Link>
          </Button>
        </div>
      </header>

      <Panel
        variant="subtle"
        className="border-[#2f7f5f]/32 bg-[linear-gradient(170deg,rgba(15,31,26,0.82),rgba(11,18,16,0.88))] p-4 sm:p-5"
      >
        <p className="font-codex text-[10px] uppercase tracking-[0.14em] text-[#86efac]/90">Category</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                category === c.id
                  ? "border-[#4ade80]/55 bg-[#0b1210]/70 text-[#e8fff1] shadow-[0_0_20px_rgba(74,222,128,0.12)]"
                  : "border-[#214537]/50 bg-[#0b1210]/35 text-[#9fc8b6] hover:border-[#2f7f5f]/55 hover:text-[#ddfeea]",
              )}
            >
              <span className="font-medium">{c.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-[#8fbc9f]">{catMeta.blurb}</p>
      </Panel>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[10rem] flex-1">
          <label className="block font-codex text-[10px] uppercase tracking-[0.12em] text-[#86efac]/85">Mode</label>
          <select
            className="mt-1 w-full rounded-md border border-[#214537]/55 bg-[#0b1210]/80 px-3 py-2 text-sm text-[#e8fff1] outline-none focus:border-[#4ade80]/45"
            value={mode}
            onChange={(e) => setMode(e.target.value as FragmentsLeaderboardModeFilter)}
          >
            {MODE_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[10rem] flex-1">
          <label className="block font-codex text-[10px] uppercase tracking-[0.12em] text-[#86efac]/85">
            Difficulty
          </label>
          <select
            className="mt-1 w-full rounded-md border border-[#214537]/55 bg-[#0b1210]/80 px-3 py-2 text-sm text-[#e8fff1] outline-none focus:border-[#4ade80]/45"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value as FragmentsLeaderboardDifficultyFilter)}
          >
            {DIFF_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {err ? (
        <p className="text-sm text-[#fcd9a8]" role="alert">
          {err}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[#9fc8b6]">Opening the ledger…</p>
      ) : entries.length === 0 ? (
        <Panel
          variant="subtle"
          className="border-[#214537]/45 bg-[#0b1210]/50 p-6 text-center text-sm text-[#9fc8b6]"
        >
          <p className="font-medium text-[#ddfeea]">No records have been etched yet.</p>
          <p className="mt-2 text-xs leading-relaxed text-[#8fbc9f]">
            The archive has no qualifying restorations for this selection — or nothing has passed the gentle validity
            gate (≥ 500ms, ≥ 1 move). Continue restoring to see names appear here.
          </p>
          <Button size="sm" variant="outline" className="mt-4 border-[#2f7f5f]/50" asChild>
            <Link href="/puzzle">Return to restorations</Link>
          </Button>
        </Panel>
      ) : (
        <ol className="space-y-2">
          {entries.map((e) => {
            const prestige = e.rank <= 3;
            return (
              <li
                key={entryKey(e, category)}
                className={cn(
                  "flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5 sm:px-4",
                  prestige
                    ? "border-[#4ade80]/35 bg-[linear-gradient(90deg,rgba(74,222,128,0.08),rgba(11,18,16,0.5))]"
                    : "border-[#214537]/45 bg-[#0b1210]/45",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-codex text-xs tabular-nums",
                    prestige ? "bg-[#1a3d2e] text-[#b6f5d2]" : "bg-[#0f1815] text-[#9fc8b6]",
                  )}
                >
                  {e.rank}
                </span>
                <Link
                  href={`/u/${encodeURIComponent(e.userId)}/puzzle`}
                  className="flex min-w-0 flex-1 items-center gap-2 hover:opacity-90"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#214537]/55 bg-[#081410] text-xs font-semibold text-[#c5f2d9]">
                    {e.avatarUrl ? (
                      <img src={e.avatarUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span aria-hidden>{e.username.slice(0, 1).toUpperCase()}</span>
                    )}
                  </span>
                  <span className="min-w-0 truncate font-medium text-[#e8fff1]">{e.username}</span>
                </Link>
                <div className="ml-auto flex min-w-0 flex-col items-end gap-0.5 text-right sm:ml-0">
                  <span className="font-codex text-sm tabular-nums text-[#b6f5d2]">{formatPrimaryValue(category, e)}</span>
                  {category === "fastest" && e.moves != null ? (
                    <span className="text-[10px] text-[#7aab92]">{e.moves} moves</span>
                  ) : null}
                  {category === "fewest_moves" && e.timeMs != null ? (
                    <span className="text-[10px] text-[#7aab92]">{formatClock(e.timeMs)}</span>
                  ) : null}
                  {category === "most_restorations" && e.uniqueCardsRestored != null ? (
                    <span className="text-[10px] text-[#7aab92]">{e.uniqueCardsRestored} unique cards</span>
                  ) : null}
                  {category === "most_unique_cards" && e.puzzlesCompleted != null ? (
                    <span className="text-[10px] text-[#7aab92]">{e.puzzlesCompleted} total runs</span>
                  ) : null}
                </div>
                {(category === "fastest" || category === "fewest_moves") && (e.cardName || e.completedAt) ? (
                  <div className="w-full basis-full border-t border-[#214537]/35 pt-2 text-xs text-[#9fc8b6] sm:pl-[3.25rem]">
                    {e.cardName ? <span className="font-medium text-[#ddfeea]">{e.cardName}</span> : null}
                    {e.cardName && e.fabSet ? <span className="text-[#7aab92]"> · {e.fabSet}</span> : null}
                    {!e.cardName && e.fabSet ? <span>{e.fabSet}</span> : null}
                    {e.rarity ? <span className="text-[#7aab92]"> · {e.rarity}</span> : null}
                    {e.completedAt ? (
                      <span className="mt-1 block text-[10px] text-[#7aab92]">{formatRelative(e.completedAt)}</span>
                    ) : null}
                  </div>
                ) : null}
                {(category === "most_restorations" || category === "most_unique_cards") && e.completedAt ? (
                  <div className="w-full basis-full border-t border-[#214537]/35 pt-1 text-[10px] text-[#7aab92] sm:pl-[3.25rem]">
                    Last qualifying run {formatRelative(e.completedAt)}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      {!loading && hasMore ? (
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loadingMore}
            className="border-[#2f7f5f]/50 text-[#c5f2d9]"
            onClick={() => void load(offset + limit, true)}
          >
            {loadingMore ? "Turning the page…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
