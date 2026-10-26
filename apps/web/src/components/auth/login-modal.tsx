"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { LoginPanel } from "@/components/auth/login-panel";
import type { Brand } from "@/lib/experience-brand";
import { cn } from "@/lib/utils/cn";

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
  brand?: Brand;
};

export function LoginModal({ open, onClose, brand = "guess" }: LoginModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const isCodex = brand === "codex";
  const isFragments = brand === "fragments";

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      panelRef.current?.querySelector<HTMLElement>("button")?.focus();
    }
  }, [open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto" role="presentation">
      {/* Backdrop — rendered via portal so backdrop-filter on the header doesn't confine it */}
      <button
        type="button"
        className={cn(
          "fixed inset-0 backdrop-blur-[2px]",
          isCodex ? "bg-[#05070d]/72" : isFragments ? "bg-[#050b09]/74" : "bg-black/65",
        )}
        aria-label="Close sign-in"
        onClick={onClose}
      />
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(
            "relative z-10 w-full max-w-md rounded-lg p-6",
            isCodex
              ? "border border-[#60A5FA]/26 bg-[linear-gradient(170deg,rgba(18,24,38,0.96),rgba(11,13,18,0.98))] shadow-[0_24px_64px_rgba(0,0,0,0.6),0_0_26px_rgba(59,130,246,0.16)]"
              : isFragments
                ? "border border-[#2F7F5F]/36 bg-[linear-gradient(170deg,rgba(15,31,26,0.95),rgba(11,18,16,0.98))] shadow-[0_24px_64px_rgba(0,0,0,0.62),0_0_24px_rgba(74,222,128,0.13)]"
              : "border border-[var(--wine-deep)]/90 bg-[var(--plum)]/95 shadow-[0_24px_64px_rgba(0,0,0,0.55)]",
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <h2
              id={titleId}
              className={cn(
                "text-lg font-semibold tracking-wide",
                isCodex
                  ? "font-codex text-[#E6EEFF]"
                  : isFragments
                    ? "font-codex text-[#E7FFF0]"
                    : "font-display text-[var(--parchment)]",
              )}
            >
              Sign in
            </h2>
            <button
              type="button"
              className={cn(
                "rounded-md px-2 py-1 text-sm",
                isCodex
                  ? "text-[#AFC3EC] hover:bg-[#1a2338]/70 hover:text-[#E6EEFF]"
                  : isFragments
                    ? "text-[#A7D6BD] hover:bg-[#17352b]/70 hover:text-[#E7FFF0]"
                  : "text-[var(--mist)] hover:bg-[var(--wine)]/50 hover:text-[var(--parchment)]",
              )}
              onClick={onClose}
            >
              Close
            </button>
          </div>
          <LoginPanel variant="modal" brand={brand} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
