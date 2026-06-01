"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/components/auth/auth-context";
import { AppBackgroundSync } from "@/components/layout/app-background-sync";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <AppBackgroundSync />
      {children}
    </AuthProvider>
  );
}
