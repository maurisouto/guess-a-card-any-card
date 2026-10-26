"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FragmentsLayoutShell } from "@/components/layout/fragments-layout-shell";
import { FragmentsProfileView } from "@/components/profile/fragments-profile-view";
import { fetchPublicFragmentsProfile } from "@/lib/fragments/fragments-api";
import type { FragmentsProfileResponse } from "@/lib/fragments/types";

export function FragmentsPublicProfileClient({ userId }: { userId: string }) {
  const [data, setData] = useState<FragmentsProfileResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void fetchPublicFragmentsProfile(userId)
      .then(setData)
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Could not load Fragments profile.";
        setErr(msg);
        setData(null);
      });
  }, [userId]);

  if (!data && !err) {
    return (
      <FragmentsLayoutShell>
        <p className="text-sm text-[#9fc8b6]">Loading…</p>
      </FragmentsLayoutShell>
    );
  }
  if (err === "not_found") {
    return (
      <FragmentsLayoutShell>
        <p className="text-sm text-[#9fc8b6]">
          No Fragments profile found for that reader. Return to the{" "}
          <Link href="/" className="text-[#c5f2d9] underline underline-offset-2">
            Codex hub
          </Link>
          .
        </p>
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
      <FragmentsProfileView data={data} isOwnProfile={false} />
    </FragmentsLayoutShell>
  );
}
