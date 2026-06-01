"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export type SetMultiSelectTone = "guess" | "fragments";

export type SetMultiSelectProps = {
  options: string[];
  value: Set<string>;
  onChange: (next: Set<string>) => void;
  disabled?: boolean;
  /** While the `…/sets` request is in flight (cold start, network). */
  loading?: boolean;
  loadingLabel?: string;
  /** Empty state when no sets from API */
  emptyLabel?: string;
  /** Summary when `value` is empty (e.g. “all sets” vs “choose sets”). */
  allSetsSummary?: string;
  tone?: SetMultiSelectTone;
  className?: string;
};

/**
 * Multi-select for FAB release names from the game `…/sets` API (in-memory card catalog).
 */
export function SetMultiSelect({
  options,
  value,
  onChange,
  disabled,
  loading = false,
  loadingLabel = "Gathering set sigils from the archive…",
  emptyLabel = "No sets loaded from the card catalog yet.",
  allSetsSummary = "Choose one or more sets (FaB)…",
  tone = "guess",
  className,
}: SetMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function toggleOption(name: string) {
    const next = new Set(value);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    onChange(next);
  }

  const summary =
    value.size === 0
      ? allSetsSummary
      : value.size === 1
        ? [...value][0]
        : `${value.size} sets selected`;

  const labelText = loading
    ? loadingLabel
    : options.length === 0
      ? emptyLabel
      : summary;

  const canOpen = !loading && !disabled && options.length > 0;

  const triggerClass =
    tone === "fragments"
      ? "h-auto min-h-12 w-full justify-between border-[#2f7f5f]/45 bg-[#0b1210]/55 px-4 py-3 text-left font-normal text-[#bde9cf] hover:border-[#4ade80]/38 hover:bg-[#0f1f1a]/55"
      : "h-auto min-h-12 w-full justify-between border-[var(--wine-deep)] px-4 py-3 text-left font-normal text-[var(--parchment)]";

  const chevronClass = tone === "fragments" ? "text-[#7aab92]" : "text-[var(--gold-dim)]";

  const listClass =
    tone === "fragments"
      ? "absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-[#3d8f6a]/35 bg-[#0b1210]/96 py-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-sm"
      : "absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-[var(--gold)]/25 bg-[var(--plum)]/95 py-1 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-sm";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        disabled={disabled || loading || options.length === 0}
        aria-expanded={open}
        aria-busy={loading}
        aria-haspopup="listbox"
        aria-controls={listId}
        className={triggerClass}
        onClick={() => canOpen && setOpen((o) => !o)}
      >
        <span
          className={cn(
            "line-clamp-2 text-sm",
            loading && tone === "guess" && "animate-pulse text-[var(--gold-dim)]",
            loading && tone === "fragments" && "animate-pulse text-[#7aab92]",
          )}
        >
          {labelText}
        </span>
        <span className={cn("ml-2 shrink-0", chevronClass)} aria-hidden>
          {loading ? "…" : open ? "\u25B2" : "\u25BC"}
        </span>
      </Button>
      {open && canOpen ? (
        <div id={listId} role="listbox" aria-multiselectable="true" className={listClass}>
          {options.map((name) => {
            const checked = value.has(name);
            return (
              <label
                key={name}
                role="option"
                aria-selected={checked}
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition-colors",
                  tone === "fragments"
                    ? checked
                      ? "bg-[#2f7f5f]/28 text-[#ddfeea]"
                      : "text-[#9fc8b6] hover:bg-[#0f1f1a]/75"
                    : checked
                      ? "bg-[var(--gold)]/12 text-[var(--gold-bright)]"
                      : "text-[var(--parchment-dim)] hover:bg-[var(--void)]/60",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleOption(name)}
                  className={cn(
                    "h-4 w-4 rounded",
                    tone === "fragments"
                      ? "border-[#3d8f6a]/55 bg-[#0b1210] text-[#4ade80]"
                      : "border-[var(--gold-dim)] bg-[var(--void)] text-[var(--gold)]",
                  )}
                />
                <span className="min-w-0 flex-1">{name}</span>
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
