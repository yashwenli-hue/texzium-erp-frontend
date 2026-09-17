"use client";

import { createContext, useContext, useMemo, ReactNode } from "react";
import { RevenueOSRepository } from "./interfaces";
import { createMockRepository } from "./mock/mockRepository";
// When ready: import { createRealRepository } from "./real/realRepository";

const RepositoryContext = createContext<RevenueOSRepository | null>(null);

export function RepositoryProvider({ children }: { children: ReactNode }) {
  // SINGLE SWAP POINT: replace createMockRepository() with
  // createRealRepository() (or branch on process.env.NEXT_PUBLIC_USE_MOCK)
  // once the real backend integration is ready. Nothing else in the app
  // needs to change.
  const repository = useMemo(() => createMockRepository(), []);

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
