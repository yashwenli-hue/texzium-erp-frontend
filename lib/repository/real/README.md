# Real repository implementation (not yet built)

This folder is intentionally empty of implementation. When the existing
RevenueOS backend is ready to be integrated:

1. Create one file per entity here (e.g. `realLeadRepository.ts`), each
   implementing the same interface from `lib/repository/interfaces.ts`
   that the corresponding mock class implements (e.g. `ILeadRepository`).
2. Each method should call the real backend endpoint with `fetch` (or
   whatever HTTP client / auth wrapper the existing app standardizes on)
   and map the response into the domain types in `lib/types/domain.ts`.
   Field-name and shape mismatches between the mock's assumed domain
   types and the real API response are exactly what
   `docs/backend-ui-contract.md` exists to track — resolve those there,
   not by changing backend behavior.
3. Create `realRepository.ts` exporting a `createRealRepository()` function
   mirroring `createMockRepository()` in `lib/repository/mock/mockRepository.ts`.
4. In `lib/repository/RepositoryProvider.tsx`, swap the single
   `createMockRepository()` call for `createRealRepository()` (or branch on
   an environment variable during a transition period).

No component, hook, or page should need to change for this swap — if one
does, it's a sign something imported the mock directly instead of going
through the repository interfaces, which should be fixed.
