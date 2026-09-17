# RevenueOS Frontend

Interactive frontend for the RevenueOS (CRM) module of the Texzium ERP.
Currently running on a **temporary in-memory mock repository** so the full
UX can be exercised before connecting to the existing backend. The backend
at `/root/texzium-erp/backend` is untouched by this project.

## Run

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # tsc --noEmit
```

Note: mock data lives in browser memory only — a refresh resets to seed data.
That is intentional; persistence arrives with the real API, not localStorage.

## Architecture

```
app/ (14 screens)            ← UI components (Next.js App Router pages)
components/                  ← shell, ui primitives, kanban, forms
lib/hooks/                   ← hooks/state (loading, mutations, refetch)
lib/repository/interfaces.ts ← repository/service interfaces  ★ the seam
lib/repository/mock/         ← temporary local implementation (DELETE later)
lib/repository/real/         ← future fetch-based implementation (empty)
```

UI components and hooks depend **only** on the interfaces. To integrate the
real backend: implement the same interfaces in `lib/repository/real/`
(see `lib/repository/real/README.md`), then swap one line in
`lib/repository/RepositoryProvider.tsx`. One deliberate exception is
documented inline: `lib/hooks/useLiveCounts.ts` (sidebar badge counts)
subscribes to the mock store directly and needs its internals — not its
return shape — reimplemented for the real API.

Every assumption that must be checked against the existing backend is
tracked in **`docs/backend-ui-contract.md`**. Do not modify the backend to
match this frontend; map differences inside the real repository layer.

## Screens

Dashboard, Leads, Lead Details, Lead Pipeline (drag-and-drop kanban),
Customers, Customer Details, Contacts, Activities, Follow-ups/Tasks, Notes,
Opportunities, Quotations, Notifications, Search — all navigable from the
sidebar; detail screens open by clicking rows/cards.
