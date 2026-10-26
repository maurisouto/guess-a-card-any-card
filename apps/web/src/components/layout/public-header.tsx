"use client";

import { usePathname } from "next/navigation";
import { CodexHeader } from "@/components/layout/codex-header";
import { FragmentsHeader } from "@/components/layout/fragments-header";
import { SiteHeader } from "@/components/layout/site-header";
import { getBrandFromPathname } from "@/lib/experience-brand";

/** Route-aware header by active experience brand. */
export function PublicHeader() {
  const pathname = usePathname();
  const brand = getBrandFromPathname(pathname);
  if (brand === "codex") return <CodexHeader />;
  if (brand === "fragments") return <FragmentsHeader />;
  return <SiteHeader />;
}
