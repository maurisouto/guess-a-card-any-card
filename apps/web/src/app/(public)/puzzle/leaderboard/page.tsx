import type { Metadata } from "next";

import { FragmentsLayoutShell } from "@/components/layout/fragments-layout-shell";
import { FragmentsLeaderboardClient } from "@/features/fragments/components/fragments-leaderboard-client";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Hall of records · Fragments of Rathe",
  description: "Fragments-only restoration leaderboards — fastest runs, fewest moves, and collection breadth.",
  openGraph: {
    title: `Hall of records · Fragments · ${siteConfig.shortName}`,
    description: "Restoration leaderboards for Fragments of Rathe.",
    type: "website",
  },
};

export default function PuzzleLeaderboardPage() {
  return (
    <FragmentsLayoutShell>
      <FragmentsLeaderboardClient />
    </FragmentsLayoutShell>
  );
}
