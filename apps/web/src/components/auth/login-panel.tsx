"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import type { Brand } from "@/lib/experience-brand";
import { cn } from "@/lib/utils/cn";

type LoginPanelProps = {
  variant: "page" | "modal";
  brand?: Brand;
  className?: string;
};

export function LoginPanel({ variant, brand = "guess", className }: LoginPanelProps) {
  const {
    isConfigured,
    isLoading,
    signInWithGoogle,
    signInWithDiscord,
    signInWithMagicLink,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [magicBusy, setMagicBusy] = useState(false);
  const [magicMessage, setMagicMessage] = useState<string | null>(null);
  const [magicError, setMagicError] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className={cn("text-sm text-[var(--mist)]", className)}>
        Checking session…
      </div>
    );
  }

  if (!isConfigured) {
    if (process.env.NODE_ENV === "development") {
      return (
        <p className={cn("text-sm text-[var(--mist)]", className)}>
          Sign-in is not configured locally. Set{" "}
          <code className="rounded bg-[var(--wine)]/40 px-1 text-xs">
            NEXT_PUBLIC_SUPABASE_URL
          </code>{" "}
          and{" "}
          <code className="rounded bg-[var(--wine)]/40 px-1 text-xs">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>{" "}
          in your <code className="rounded bg-[var(--wine)]/40 px-1 text-xs">.env</code>.
        </p>
      );
    }
    return (
      <p className={cn("text-sm text-[var(--mist)]", className)}>
        Sign-in is temporarily unavailable. Please try again later.
      </p>
    );
  }

  const busyLabel = magicBusy ? "Sending…" : "Send magic link";
  const isCodex = brand === "codex";
  const isFragments = brand === "fragments";
  const oauthButtonClass = isCodex
    ? "rounded-md border border-[#60A5FA]/35 bg-[linear-gradient(180deg,rgba(18,24,38,0.92),rgba(11,13,18,0.96))] px-4 py-2.5 text-sm font-semibold text-[#DCE8FF] transition-[border-color,box-shadow,background-color] hover:border-[#60A5FA]/65 hover:bg-[linear-gradient(180deg,rgba(26,36,56,0.95),rgba(14,20,34,0.98))] hover:shadow-[0_0_20px_rgba(59,130,246,0.22)]"
    : isFragments
      ? "rounded-md border border-[#4ADE80]/35 bg-[linear-gradient(180deg,rgba(15,31,26,0.94),rgba(11,18,16,0.98))] px-4 py-2.5 text-sm font-semibold text-[#DDFEEA] transition-[border-color,box-shadow,background-color] hover:border-[#86EFAC]/65 hover:bg-[linear-gradient(180deg,rgba(23,46,38,0.95),rgba(13,25,21,0.98))] hover:shadow-[0_0_20px_rgba(74,222,128,0.2)]"
    : "rounded-md border border-[var(--gold)]/50 bg-[var(--plum-mid)]/90 px-4 py-2.5 text-sm font-semibold text-[var(--parchment)] transition-colors hover:border-[var(--gold-bright)]/70 hover:bg-[var(--wine)]/50";
  const sectionBorderClass = isCodex
    ? "border-[#60A5FA]/20"
    : isFragments
      ? "border-[#2F7F5F]/35"
      : "border-[var(--wine-deep)]/80";
  const sectionLabelClass = isCodex
    ? "text-[#BBD4FF]"
    : isFragments
      ? "text-[#BDE9CF]"
    : "text-[var(--parchment-dim)]";
  const inputClass = isCodex
    ? "rounded-md border border-[#60A5FA]/28 bg-[#0B0D12]/80 px-3 py-2 text-sm text-[#E9F1FF] placeholder:text-[#9CB5E0]/60 focus:border-[#60A5FA]/65 focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/25"
    : isFragments
      ? "rounded-md border border-[#2F7F5F]/45 bg-[#0B1210]/80 px-3 py-2 text-sm text-[#E9FFF2] placeholder:text-[#A0CCB7]/58 focus:border-[#4ADE80]/65 focus:outline-none focus:ring-2 focus:ring-[#4ADE80]/20"
    : "rounded-md border border-[var(--wine-deep)]/90 bg-[var(--void)]/80 px-3 py-2 text-sm text-[var(--parchment)] placeholder:text-[var(--mist)]/50 focus:border-[var(--gold)]/50 focus:outline-none";
  const submitClass = isCodex
    ? "shrink-0 rounded-md border border-[#60A5FA]/45 bg-[linear-gradient(180deg,#3B82F6_0%,#2A66CD_100%)] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_16px_rgba(59,130,246,0.25)] transition-[box-shadow,filter] hover:brightness-105 hover:shadow-[0_0_22px_rgba(96,165,250,0.35)] disabled:opacity-50"
    : isFragments
      ? "shrink-0 rounded-md border border-[#4ADE80]/45 bg-[linear-gradient(180deg,#2F7F5F_0%,#245F48_100%)] px-4 py-2 text-sm font-semibold text-[#ECFFF2] shadow-[0_0_16px_rgba(74,222,128,0.22)] transition-[box-shadow,filter] hover:brightness-105 hover:shadow-[0_0_22px_rgba(134,239,172,0.3)] disabled:opacity-50"
    : "shrink-0 rounded-md bg-[var(--gold)]/90 px-4 py-2 text-sm font-semibold text-[var(--void)] transition-opacity disabled:opacity-50";
  const magicMessageClass = isCodex
    ? "text-[#C8DCFF]"
    : isFragments
      ? "text-[#CFF9DD]"
      : "text-[var(--gold-bright)]/90";

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          className={oauthButtonClass}
          onClick={async () => {
            setOauthError(null);
            try {
              await signInWithGoogle();
            } catch (e) {
              setOauthError(e instanceof Error ? e.message : "Google sign-in failed.");
            }
          }}
        >
          Continue with Google
        </button>
        <button
          type="button"
          className={oauthButtonClass}
          onClick={async () => {
            setOauthError(null);
            try {
              await signInWithDiscord();
            } catch (e) {
              setOauthError(e instanceof Error ? e.message : "Discord sign-in failed.");
            }
          }}
        >
          Continue with Discord
        </button>
      </div>

      {oauthError ? (
        <p className="text-sm text-red-300/90" role="alert">
          {oauthError}
        </p>
      ) : null}

      <div className={cn("border-t pt-5", sectionBorderClass)}>
        <p className={cn("mb-2 text-xs font-medium uppercase tracking-[0.12em]", sectionLabelClass)}>
          Email magic link
        </p>
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={async (ev) => {
            ev.preventDefault();
            setMagicError(null);
            setMagicMessage(null);
            if (!email.trim()) {
              setMagicError("Enter your email.");
              return;
            }
            setMagicBusy(true);
            const { error } = await signInWithMagicLink(email);
            setMagicBusy(false);
            if (error) {
              setMagicError(error.message);
              return;
            }
            setMagicMessage(
              "Check your inbox for a sign-in link. You can close this window and return after clicking it.",
            );
            setEmail("");
          }}
        >
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-[var(--mist)]">
            <span className="sr-only">Email</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            disabled={magicBusy}
            className={submitClass}
          >
            {busyLabel}
          </button>
        </form>
        {magicError ? (
          <p className="mt-2 text-sm text-red-300/90" role="alert">
            {magicError}
          </p>
        ) : null}
        {magicMessage ? (
          <p className={cn("mt-2 text-sm", magicMessageClass)} role="status">
            {magicMessage}
          </p>
        ) : null}
      </div>

      {variant === "modal" ? (
        <p className="text-xs text-[var(--mist)]">
          Guest play stays available without an account. Signing in is optional.
        </p>
      ) : null}
    </div>
  );
}
