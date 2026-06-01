import type { ReactNode } from "react";
import { ReturnToHubLink } from "@/components/navigation/return-to-hub-link";
import { Panel } from "@/components/ui/panel";
import { cn } from "@/lib/utils/cn";

export type RouteShellProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
  /** Main mode lobby pages: subtle link back to the hub (`/`). */
  showReturnToHub?: boolean;
};

export function RouteShell({
  title,
  description,
  children,
  className,
  showReturnToHub,
}: RouteShellProps) {
  return (
    <div className={cn("mx-auto w-full max-w-3xl flex-1 px-0 pb-8 pt-4 sm:pt-6", className)}>
      {showReturnToHub ? (
        <ReturnToHubLink className="mb-5 text-center sm:mb-6 sm:text-left" />
      ) : null}
      <header className="mb-8 text-center sm:mb-10 sm:text-left">
        <h1 className="font-display text-2xl font-semibold tracking-[0.12em] text-[var(--parchment)] sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[var(--parchment-dim)] sm:mx-0">
            {description}
          </p>
        ) : null}
      </header>
      <Panel variant="textured" className="border-[var(--gold)]/15 p-5 sm:p-8">
        {children}
      </Panel>
    </div>
  );
}
