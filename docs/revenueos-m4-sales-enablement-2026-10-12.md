# RevenueOS M4 — Sales Enablement content library

Prepared 2026-10-12. **ACTIVE since 2026-10-12 21:56**: backend `ccf151a` (pid 419454, 357 routes), frontend `8d01351` (pid 420390, build `JGeXHmoOshm7ks6eZ_NSn`), `/root/texzium-content` created (0700). Before activation: Live: backend `eef8a47`
(pid 360833), frontend `ad992a0` (pid 361704, build `GFGYpZdIUFb4eGfzL3VO7`); `/root/texzium-content` does
not exist yet.

## Commits
Backend (on `eef8a47`): `1f66583` tables and permissions · `efff3f6` storage, type checks, GPS stripping, signed
access · `1bebde1` library API and sharing · `385d091` shares block lead/customer deletion · `ccf151a` test.
Frontend (on `ad992a0`): `b9c25fb` repository layer · `8af574c` Content Library pages · `8d01351` share from
lead, opportunity and customer.

## What it does
- One library for catalogues (PDF ≤ 25 MB), photos (JPEG/PNG/WebP ≤ 10 MB) and videos (MP4 ≤ 200 MB). Types
  are decided from the file's bytes; the kind and the file name must match; SVG, HTML, MOV and everything
  else are refused. Files get server-generated names under `/root/texzium-content/files` (0700/0600).
- GPS removed before storing: EXIF GPS directory emptied (orientation kept), XMP and IPTC dropped, MP4
  `udta`/`meta` boxes zeroed in place (offsets unchanged).
- Immutable versions; archive (reason) and restore; archived content cannot be shared or edited.
- Viewing and downloads through HMAC-signed URLs bound to one file version and disposition, expiring after
  15 minutes (key derived from `JWT_SECRET`; no new secret). Single byte ranges (206/416) for video seeking.
  This route (`GET /content-files/:fileId`) is the one new entry in `PUBLIC_ROUTES`.
- "Share content" on Lead, Opportunity and Customer (content.view + content.share): records the exact version
  with a `CONTENT_SHARED` lead-timeline entry and/or customer event in one transaction (asset, lead and
  customer rows locked); inactive lead/customer refused; then download + WhatsApp chat with the message
  filled in (wa.me). No public links, no WhatsApp Business file sending.
- Recorded shares block lead and customer deletion.
- Permissions `content.view`, `content.manage`, `content.share`: SUPER_ADMIN only. Super Admin signs in again.

## Migrations
`20261018_content_library.sql` (3 tables, check constraints, FKs: leads/opportunities/customers RESTRICT,
users/inventory SET NULL) and `20261018_content_library_permissions.sql`. Additive and idempotent; rollback
blocks tested (schema and data return exactly). Applying them changes no existing value (checked column by
column).

## Tests
- Backend full suite 62 suites / 2,060 tests (+1 after `ccf151a`); new unit and HTTP specs (types, stripping,
  signatures, ranges, storage, every route 401/403 before any read or write).
- Security mutations (25): every one detected (permissions, signature, expiry, file binding, full-length
  compare, GPS/XMP/MP4 stripping, type/kind/extension/size checks, key traversal, ranges, extra public route,
  temp-file cleanup, deletion blockers, archived and inactive share refusals).
- Scratch integration through the Next proxy: 55/55 (100 MB MP4 upload in ~1 s; seek 206 with exact bytes;
  416; expiry, tampering, file isolation; archive; inactive; forced-failure atomicity; deletion blockers);
  frontend repository code 10/10. Frontend typecheck, lint, production build clean.
- Not covered here: real video playback and phone-width rendering in a browser (no browser in this
  environment) — part of browser acceptance.

## Activation (scripts in the scratchpad `m4/act/`; rehearsed 45/45)
Backend `activate_m4_be.sh`: preflight → backup (DB dump + restore rehearsal; content directory archived and
restore-checked, or recorded absent) → archive (dist, Prisma client; checksums include the content archive) →
build (clean export of `ccf151a`, full tests, client with `.env` lookup, identical to the reference) → migrate
(creates `/root/texzium-content` 0700 with `files/` and `tmp/`) → restart (357 routes, exact set) → verify
(content checks + every earlier check, content directory unchanged). Frontend `activate_m4_fe.sh`:
preflight → archive → deploy (refused until the M4 backend runs) → verify.

## Rollback
Frontend first (`activate_m4_fe.sh rollback`), then backend (`activate_m4_be.sh rollback`): code and Prisma
client back to `eef8a47`; tables and the content directory are kept (the old code runs on them; rehearsed:
all earlier checks pass). `activate_m4_be.sh restore-content` (only after the code rollback) moves the current
content directory aside (kept) and restores the backup (or the absent state). Data rollback blocks of the two
migrations only before any share is recorded.

## Open points
- WhatsApp handoff: the person attaches the downloaded file in WhatsApp (wa.me cannot carry a file).
- A signed URL lasts 15 minutes; the preview renews it, a download link in the share dialog does not.
- Roles: only SUPER_ADMIN holds the permissions until sales roles exist.
- PDFs are served as they were uploaded (type-checked, `nosniff`); PDF scripts run only in the browser's
  sandboxed viewer.
