"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-context";
import { FragmentsLayoutShell } from "@/components/layout/fragments-layout-shell";
import { FragmentsProfileView } from "@/components/profile/fragments-profile-view";
import { ProfileSignInCta } from "@/components/profile/profile-view";
import { fetchFragmentsProfileMe } from "@/lib/fragments/fragments-api";
import type { FragmentsProfileResponse } from "@/lib/fragments/types";

export function FragmentsProfilePageClient() {
  const { user, isLoading, isConfigured } = useAuth();
  const [data, setData] = useState<FragmentsProfileResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isConfigured || isLoading || !user) return;
    void fetchFragmentsProfileMe()
      .then(setData)
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Could not load Fragments profile.";
        setErr(msg === "unauthorized" ? "Session expired. Sign in again." : msg);
        setData(null);
      });
  }, [isConfigured, isLoading, user]);

  if (!isConfigured) {
    return (
      <FragmentsLayoutShell>
        <p className="text-sm text-[#9fc8b6]">Auth is not configured in this build.</p>
      </FragmentsLayoutShell>
    );
  }
  if (isLoading) {
    return (
      <FragmentsLayoutShell>
        <p className="text-sm text-[#9fc8b6]">Loading…</p>
      </FragmentsLayoutShell>
    );
  }
  if (!user) {
    return (
      <FragmentsLayoutShell>
        <ProfileSignInCta brand="fragments" />
      </FragmentsLayoutShell>
    );
  }
  if (!data && !err) {
    return (
      <FragmentsLayoutShell>
        <p className="text-sm text-[#9fc8b6]">Loading your Fragments profile…</p>
      </FragmentsLayoutShell>
    );
  }
  if (err) {
    return (
      <FragmentsLayoutShell>
        <p className="text-sm text-[#fcd9a8]" role="alert">
          {err}
        </p>
      </FragmentsLayoutShell>
    );
  }
  if (!data) return null;

  return (
    <FragmentsLayoutShell>
      <FragmentsProfileView data={data} isOwnProfile />
    </FragmentsLayoutShell>
  );
}
