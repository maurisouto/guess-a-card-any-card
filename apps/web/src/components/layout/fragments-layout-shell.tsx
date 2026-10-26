import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

type FragmentsLayoutShellProps = {
  children: ReactNode;
  className?: string;
};

/** Fragments-specific page shell (visual container for `/puzzle` pages). */
export function FragmentsLayoutShell({ children, className }: FragmentsLayoutShellProps) {
  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-5xl px-4 pb-20 pt-3 sm:px-6 sm:pt-6",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10 rounded-2xl bg-[radial-gradient(circle_at_20%_16%,rgba(74,222,128,0.14),transparent_38%),radial-gradient(circle_at_90%_80%,rgba(47,127,95,0.16),transparent_42%)]"
        aria-hidden
      />
      {children}
    </div>
  );
}
