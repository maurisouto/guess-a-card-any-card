"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type FragmentsCardArtGateProps = {
  imageSrc: string;
  /** Called when we fall back to mock art after a runtime load failure. */
  onFallback?: () => void;
  className?: string;
  children: ReactNode;
};

/**
 * Preloads portrait art for puzzle boards: preserves layout, soft placeholder, no spinner.
 */
export function FragmentsCardArtGate({ imageSrc, onFallback, className, children }: FragmentsCardArtGateProps) {
  const [ready, setReady] = useState(false);

  return (
    <div className={cn("relative", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt=""
        width={0}
        height={0}
        decoding="async"
        referrerPolicy="no-referrer"
        className="pointer-events-none absolute opacity-0"
        onLoad={() => setReady(true)}
        onError={() => {
          onFallback?.();
          setReady(true);
        }}
      />
      <div
        className={cn(
          "transition-opacity duration-500 ease-out",
          ready ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!ready}
      >
        {children}
      </div>
      {!ready ? (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[#0b1210]/72 ring-1 ring-[#2f7f5f]/22"
          aria-busy
          aria-label="Loading card art"
        >
          <div className="h-[42%] max-h-40 w-[55%] max-w-[11rem] rounded-xl border border-[#2f7f5f]/25 bg-[linear-gradient(110deg,rgba(15,31,26,0.55)_0%,rgba(74,222,128,0.07)_42%,rgba(15,31,26,0.55)_78%)] bg-[length:200%_100%] motion-safe:animate-[fragments-skeleton-shimmer_1.35s_ease-in-out_infinite]" />
        </div>
      ) : null}
    </div>
  );
}
