import type { Metadata } from "next";
import { FragmentsProfilePageClient } from "@/components/profile/fragments-profile-page-client";

export const metadata: Metadata = {
  title: "Fragments Profile",
  description: "Your Fragments of Rathe runs, records, and card highlights.",
};

export default function PuzzleProfilePage() {
  return <FragmentsProfilePageClient />;
}
