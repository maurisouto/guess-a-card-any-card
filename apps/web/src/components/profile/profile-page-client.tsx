"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { ProfileSignInCta, ProfileView } from "@/components/profile/profile-view";
import { fetchProfileMe } from "@/lib/profile/profile-api";
import type { PublicProfileResponse } from "@/lib/profile/types";
import { RouteShell } from "@/components/layout/route-shell";
import type { Brand } from "@/lib/experience-brand";

type ProfileScope = "global" | "guess";

type ProfilePageClientProps = {
  brand?: Brand;
  scope?: ProfileScope;
};

const shellCopy = {
  global: {
    title: "Codex Profile",
    description: "Your global account overview across experiences and recent activity.",
    signedOutDescription: "Sign in to view your Codex identity and progress across experiences.",
  },
  guess: {
    title: "Guess Profile",
    description: "Your Guess stats, records, and challenge history.",
    signedOutDescription: "Sign in to view your Guess profile and performance history.",
  },
} as const;

export function ProfilePageClient({ brand = "guess", scope = "global" }: ProfilePageClientProps) {
  const { user, isLoading, isConfigured } = useAuth();
  const [data, setData] = useState<PublicProfileResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const copy = shellCopy[scope];

  useEffect(() => {
    if (!isConfigured || isLoading) {
      return;
    }
    if (!user) {
      setData(null);
      setErr(null);
      return;
    }
    setLoading(true);
    setErr(null);
    void fetchProfileMe()
      .then((d) => {
        setData(d);
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Could not load profile.";
        if (msg === "unauthorized") {
          setErr("Session expired. Sign in again.");
        } else {
          setErr(msg);
        }
        setData(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user, isLoading, isConfigured]);

  if (!isConfigured) {
    return (
      <RouteShell
        title={copy.title}
        description={copy.description}
      >
        <p className="text-sm text-[var(--mist)]">Auth is not configured in this build.</p>
      </RouteShell>
    );
  }

  if (isLoading) {
    return (
      <RouteShell title={copy.title} description={copy.description}>
        <p className="text-sm text-[var(--mist)]">Loading…</p>
      </RouteShell>
    );
  }

  if (!user) {
    return (
      <RouteShell
        title={copy.title}
        description={copy.signedOutDescription}
      >
        <ProfileSignInCta brand={brand} />
      </RouteShell>
    );
  }

  if (loading || (data == null && !err)) {
    return (
      <RouteShell title={copy.title} description={copy.description}>
        <p className="text-sm text-[var(--mist)]">Loading your profile…</p>
      </RouteShell>
    );
  }

  if (err) {
    return (
      <RouteShell title={copy.title} description="We could not load this profile.">
        <p className="text-sm text-red-300/90" role="alert">
          {err}
        </p>
        <p className="mt-2 text-sm text-[var(--mist)]">
          Try signing out and back in, or play a reading while we sort it out.
        </p>
      </RouteShell>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <RouteShell
      title={copy.title}
      description={
        scope === "global"
          ? "Your Codex identity, global tally, and cross-experience activity."
          : "Your Guess performance, records, and challenge trail."
      }
    >
      <ProfileView
        data={data}
        showEmail
        showPublicLink
        showShare
        brand={brand}
        scope={scope}
      />
    </RouteShell>
  );
}
