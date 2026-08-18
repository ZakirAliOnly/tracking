# Handoff

## 1. Goal

Two threads: (a) deploy the `tracking` app (Next.js 16 + Prisma + Postgres + next-auth) to a VPS at `72.61.118.49`, alongside two existing PM2-managed apps (`numu-backend`, `numu-frontend`), served at `rt.addsmint.com` via Nginx reverse proxy + PM2, with SSL via Let's Encrypt; (b) a run of feature work on top of the app itself (CSV import parity, New Installation form fields, server-side pagination, sidebar cleanup) done locally since the last deploy session, none of it pushed yet.

## 2. Current State

### Deployment — functionally complete
- Database created and reachable: `tracking` DB, `tracking_user` role, schema privileges granted.
- App cloned to `/var/www/tracking` on the VPS, dependencies installed.
- `.env.local` created on the VPS (not in git) with a working `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL=https://rt.addsmint.com`, `CRON_SECRET`.
- Prisma client generated, migrations deployed at the time (`npx prisma migrate deploy` succeeded) — **now behind two new local migrations, see below**.
- App running under PM2 as `tracking` on **port 3001** (ports 3000 and 4000 already taken by the numu apps).
- DNS resolved, Nginx site config `/etc/nginx/sites-available/tracking` (`server_name rt.addsmint.com` → `proxy_pass http://localhost:3001`) applied and reloaded (`nginx -t` clean).
- **SSL is live**: `sudo certbot --nginx -d rt.addsmint.com` succeeded, added the `listen 443 ssl` block to the same config. `certbot renew --dry-run` confirmed `rt.addsmint.com`'s simulated renewal **succeeded** (an unrelated cert on the same box, `api.numu.com.pk`, failed renewal because its own DNS record no longer exists — a numu-app issue, not ours, not touched).
- `curl -I https://rt.addsmint.com` returns `307` → `/dashboard` with `X-Powered-By: Next.js` — confirmed working over HTTPS. User was about to do a final check in an actual browser tab when this handoff was written; confirm that landed on the real login page (not NUMU) before considering this fully closed.
- **Still open:** admin login (`prisma/seed.ts` default: `admin@trackfleet.com` / `Admin@123`) has **not been seeded on the VPS** — change the hardcoded password before seeding since the repo is public on GitHub, then `npx prisma db seed`.
- **Still open:** the VPS is running the build from *before* this session's feature work (CSV import, New Installation form, pagination) — none of that has been pushed/pulled/deployed yet. See below.

### Feature work (local only, all uncommitted)
A large batch of work has landed locally since the deploy session and has **not been pushed** — the VPS is running an older build than what's on disk locally. See §3/§4 for the full file list and what each piece does. Headline items:
- CSV import (`lib/csv-import.ts`, `lib/validations/import.ts`, `actions/import.ts`, `lib/installation-write.ts`, `lib/devices.ts`, `lib/import-plan.ts`) now imports the full Data-entry-sheet shape — contacts, address, vehicle detail, device identity, a fuller money breakdown — not just the original 7 columns.
- New Installation modal (`components/installations/NewInstallationModal.tsx`, `actions/installations.ts`) gained Phone, Amount Device, and a collapsible "More details" section (address, contacts, vehicle detail, device reference).
- Server-side pagination across Installations, Renewals, Expenses, Stock, Suppliers — new `lib/pagination.ts`, `components/ui/Pagination.tsx`, `lib/renewals-query.ts` (raw-SQL renewal status/filtering), plus every affected `page.tsx`/`*View.tsx`.
- Sidebar: Customers link removed from nav (route itself untouched, still reachable by URL).
- Two new Prisma migrations exist locally, applied to the **local** dev DB only:
  - `prisma/migrations/20260818000000_installation_other_amount/` — adds `installations.other_amount`
  - `prisma/migrations/20260818010000_installation_device_reference/` — adds `installations.gsm_no`, `fm_module`, `cut_off`, `imei_no`
  - **The VPS database has not run either of these.** `npx prisma migrate deploy` must be run on the VPS after the next `git pull`, or the app will crash on any code path touching those columns.
- **Renewals filters reworked (done).** Tabs cut from four to three — Pending (default) / Received / All — with a due-date range row (`from`/`to`, a plain GET form, both ends inclusive and optional) beneath them. "Pending" is `NOT is_received`, i.e. overdue + due soon + upcoming. The red badge and the "needs attention" banner still count overdue + due-soon only and deliberately ignore the date range, being a standing alert. Touched `lib/renewals-query.ts` (`RenewalFilter`, `filterCondition`, new `rangeCondition`/`whereFor`, `fetchRenewalRows` now takes a range), `components/renewals/RenewalsView.tsx`, `app/(app)/renewals/page.tsx`. Verified against the live DB and in a real browser session.

## 3. Active Files

Everything under git status as modified/untracked right now (`actions/import.ts`, `actions/installations.ts`, the 5 paginated `page.tsx`/`*View.tsx` pairs, `components/installations/ImportCsvModal.tsx`, `components/installations/NewInstallationModal.tsx`, `components/layout/Sidebar.tsx`, `context/progress-tracker.md`, `context/ui-registry.md`, `lib/csv-import.ts`, `lib/devices.ts`, `lib/import-plan.ts`, `lib/installation-write.ts`, `lib/validations/import.ts`, `prisma/schema.prisma`, plus new files `components/ui/Pagination.tsx`, `lib/pagination.ts`, `lib/renewals-query.ts`, and the two new migration folders) is local-only, not committed. The user has consistently opted to handle commits themselves this whole session — do not commit without asking first.

- `prisma/schema.prisma` — now has `Installation.otherAmount`, `Installation.gsmNo/fmModule/cutOff/imeiNo` beyond what the VPS has.
- `prisma.config.ts`, `lib/prisma.ts` — unchanged, confirmed working.

## 4. Changes Made

Deployment-session items (all previously handed off, still true):
- Fixed a real TypeScript build error in `actions/customers.ts` (`Prisma.TransactionClient` typing) — this one **was already pushed/pulled** in an earlier round, per the prior handoff; not re-verified this session.
- VPS: reinstalled `node_modules`, reset `tracking_user`'s Postgres password, recreated `.env.local` in the correct directory, started `tracking` under PM2 on port 3001.

This session's feature work (all local, unpushed) — see progress-tracker.md's own new entries for full detail, summarized:
- CSV import: full column set (Contact 1–4 + mobiles, Address, Password, vehicle detail, GSM/FM Module/Cut Off/IMEI, Amount Device/Total Paid/Others), Cash forced as payment method on every imported row, IMEI matched/created against real Stock devices, day-first/month-first date ambiguity resolved by trying both, per-cell error reporting instead of first-error-only, phone/GSM fields no longer enforce exact 11 digits.
- New Installation modal: Phone field, Amount Device field, collapsible "More details" (address/contacts/vehicle/device reference) — device reference fields are plain text on the installation, deliberately not linked to Stock. Fixed a real bug caught during testing: re-submitting an installation with "More details" left blank was wiping the customer's existing contacts (contacts use wholesale-replace semantics built for CSV; the manual form now only sends `contacts` when at least one is filled in).
- Pagination: `PAGE_SIZE = 25`, URL-driven filters + page numbers on Installations/Renewals/Expenses/Stock/Suppliers, `groupBy`/`aggregate` replacing full-row-scan stat tiles on Stock and Suppliers, Renewals' "received" status handled via verified raw SQL (see progress-tracker.md for why it can't be a plain Prisma filter).
- Sidebar: Customers nav item removed.

## 5. Failed Attempts

From the deploy session (all previously handed off):
- First `pm2 start` crash-looped before `.env.local`/build existed.
- First `npm run build` on the VPS failed on missing `node_modules`, then on the `actions/customers.ts` TypeScript error.
- `prisma generate`/`migrate deploy` each failed once on VPS — wrong `.env.local` directory, then a Postgres password mismatch. Both resolved.
- `psql` SQL pasted directly into bash instead of an open session, twice; one `\c tracking` paste-corruption glitch. Both resolved by retyping commands individually.

Nothing new failed this session — the pagination and CSV/form work were all verified directly against the real local database (rolled-back transactions, raw-SQL row-for-row comparisons against the prior JS logic) and with an actual Playwright-driven browser session against the local dev server before being considered done.

## 6. Next Step

1. Confirm in an actual browser (not just curl) that `https://rt.addsmint.com` shows the tracking login page, not NUMU — last thing pending from the SSL setup.
2. Before seeding: change the hardcoded `Admin@123` in `prisma/seed.ts` to a strong password (locally or directly on the VPS), then `npx prisma db seed`.
3. Decide with the user whether/when to ship this session's feature work (CSV import, New Installation form, pagination) to the VPS. When ready: commit (ask first), push, on the VPS `git pull`, `npm ci`, **`npx prisma migrate deploy` (two new migrations pending — `installation_other_amount`, `installation_device_reference`)**, `npm run build`, `pm2 restart tracking`.
4. Once the manual deploy flow above is confirmed working end-to-end, worth writing a `deploy.sh` (`git pull && npm ci && npx prisma migrate deploy && npm run build && pm2 restart tracking`) for future redeploys.
