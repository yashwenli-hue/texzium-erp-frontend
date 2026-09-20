"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";
import { RevenueOSRepository } from "./interfaces";
import { createMockRepository } from "./mock/mockRepository";
import { createRealRepository } from "./real/realRepository";

const RepositoryContext = createContext<RevenueOSRepository | null>(null);

export function RepositoryProvider({ children }: { children: ReactNode }) {
  // SINGLE SWAP POINT. Stage 2A (Leads + Opportunities) is wired to the real
  // backend by default; set NEXT_PUBLIC_USE_MOCK=1 to fall back to the fully
  // in-memory mock for isolated UI/UX development. Nothing else in the app
  // needs to change either way.
  const repository = useMemo(
    () => (process.env.NEXT_PUBLIC_USE_MOCK === "1" ? createMockRepository() : createRealRepository()),
    []
  );

  return (
    <RepositoryContext.Provider value={repository}>
      {children}
    </RepositoryContext.Provider>
  );
}

export function useRepository(): RevenueOSRepository {
  const ctx = useContext(RepositoryContext);
  if (!ctx) {
    throw new Error("useRepository() must be used within a RepositoryProvider");
  }
  return ctx;
}
