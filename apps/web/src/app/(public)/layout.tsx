import type { ReactNode } from "react";
import { AppFrame } from "@/components/layout/app-frame";
import { PublicHeader } from "@/components/layout/public-header";
import { SiteFooter } from "@/components/layout/site-footer";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <PublicHeader />
      <main className="flex min-h-0 flex-1 flex-col">
        <AppFrame variant="game" compactTop>
          {children}
        </AppFrame>
      </main>
      <SiteFooter />
    </>
  );
}
