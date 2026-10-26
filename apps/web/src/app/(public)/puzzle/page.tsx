import type { Metadata } from "next";

import { FragmentsLayoutShell } from "@/components/layout/fragments-layout-shell";
import { FragmentsPlayClient } from "@/features/fragments/components/fragments-play-client";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Fragments of Rathe",
  description:
    "Play Fragment and Sliding puzzles with real Flesh and Blood card art inside Codex of Rathe.",
  openGraph: {
    title: `Fragments of Rathe · ${siteConfig.shortName}`,
    description: siteConfig.description,
    type: "website",
  },
};

export default function PuzzlePage() {
  return (
    <FragmentsLayoutShell>
      <FragmentsPlayClient />
    </FragmentsLayoutShell>
  );
}
