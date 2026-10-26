import Link from "next/link";
import { fragmentsAssetPaths } from "@/lib/design-tokens";
import { cn } from "@/lib/utils/cn";

type FragmentsLogoProps = {
  className?: string;
  href?: string;
  /** When set, opens the link in a new tab (e.g. Codex hub → Fragments). */
  openInNewTab?: boolean;
  placement?: "header" | "hero";
};

export function FragmentsLogo({
  className,
  href = "/puzzle",
  openInNewTab = false,
  placement = "header",
}: FragmentsLogoProps) {
  return (
    <Link
      href={href}
      {...(openInNewTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        "group inline-flex items-center outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-[#86EFAC]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1210]",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={placement === "hero" ? fragmentsAssetPaths.logoLockup : fragmentsAssetPaths.logoMark}
        alt="Fragments of Rathe"
        width={placement === "hero" ? 1200 : 420}
        height={placement === "hero" ? 360 : 120}
        className={cn(
          "block object-contain object-left transition-[filter] group-hover:brightness-110",
          placement === "hero"
            ? "h-[clamp(6.5rem,18vw,9rem)] w-auto max-w-[min(92vw,32rem)]"
            : "h-12 w-auto max-w-[min(66vw,22rem)] sm:h-14 sm:max-w-[min(24rem,46vw)]",
        )}
        decoding="async"
      />
    </Link>
  );
}
