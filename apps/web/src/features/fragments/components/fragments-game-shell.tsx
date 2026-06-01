"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type FragmentsGameShellProps = {
  children: ReactNode;
  className?: string;
};

export function FragmentsGameShell({ children, className }: FragmentsGameShellProps) {
  return (
    <div className={cn("relative flex flex-col gap-6", className)}>
      <div className="pointer-events-none absolute -inset-x-2 -top-2 bottom-0 -z-10 overflow-hidden rounded-[1.35rem] opacity-[0.9]" aria-hidden>
        <div
          className="absolute -left-1/4 top-0 h-[min(55vw,22rem)] w-[min(55vw,22rem)] rounded-full bg-[#4ade80]/[0.06] blur-3xl [animation:ambient-float_16s_ease-in-out_infinite]"
        />
        <div
          className="absolute -right-1/4 bottom-0 h-[min(48vw,18rem)] w-[min(48vw,18rem)] rounded-full bg-[#22c55e]/[0.05] blur-3xl [animation:ambient-float_20s_ease-in-out_infinite_reverse]"
        />
        <div className="absolute inset-0 rounded-[1.35rem] ring-1 ring-inset ring-[#2f7f5f]/15" />
      </div>
      {children}
    </div>
  );
}
