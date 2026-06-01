import Link from "next/link";
import { cn } from "@/lib/utils/cn";

export type ReturnToHubLinkProps = {
  className?: string;
};

/** Subtle breadcrumb-style escape hatch to the multi-experience hub (`/`). */
export function ReturnToHubLink({ className }: ReturnToHubLinkProps) {
  return (
    <div className={cn(className)}>
      <Link
        href="/"
        className={cn(
          "inline-flex max-w-full items-baseline gap-1 py-1 text-[0.72rem] leading-snug",
          "text-[var(--gold-dim)] underline-offset-[3px] transition-colors",
          "hover:text-[var(--gold-bright)] hover:underline",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--void-deep)]",
        )}
      >
        <span aria-hidden>←</span>
        <span className="font-display font-medium tracking-[0.03em]">Return to Hub</span>
      </Link>
    </div>
  );
}
