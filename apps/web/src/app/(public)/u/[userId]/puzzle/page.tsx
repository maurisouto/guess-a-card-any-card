import type { Metadata } from "next";
import { FragmentsPublicProfileClient } from "@/components/profile/fragments-public-profile-client";

type PageProps = { params: Promise<{ userId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId } = await params;
  return {
    title: "Fragments Profile",
    description: `Fragments of Rathe profile for ${userId}.`,
  };
}

export default async function PublicPuzzleProfilePage({ params }: PageProps) {
  const { userId } = await params;
  return <FragmentsPublicProfileClient userId={userId} />;
}
