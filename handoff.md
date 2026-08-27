# Handoff

## 1. Goal

Deploy the `tracking` app (Next.js 16 + Prisma + Postgres + next-auth) to a VPS at `72.61.118.49`, alongside two existing PM2-managed apps (`numu-backend`, `numu-frontend`), served at `rt.addsmint.com` via Nginx + PM2 with Let's Encrypt SSL — and ship the batch of feature work built on top of it (CSV import parity, New Installation form fields, server-side pagination, renewals filters, installation search + pay-remaining).

## 2. Current State

**`f1393e9` (30 files) is committed and pushed. Since then, another full session of feature work has landed locally — all uncommitted. Nothing beyond `f1393e9` has been deployed to the VPS.**

- Local: `npx tsc --noEmit` and `npm run build` both pass clean.
- Uncommitted since `f1393e9`: the Faulty removal from Stock, the CSV-import stock-decrement fix, the Device/Sim `type` column, Sales Report, and the payment-method-optional rule — see §3/§4 below. None of this has been committed, let alone pushed or deployed.
- **The VPS is running the build from before `f1393e9` and is currently broken** — see §5. It will stay broken until the deploy in §6 is run, and that deploy should include everything, not just `f1393e9`.

### Infrastructure — done and working
- `tracking` DB, `tracking_user` role, schema privileges granted.
- App at `/var/www/tracking`, `.env.local` present on the VPS (not in git) with working `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL=https://rt.addsmint.com`, `CRON_SECRET`.
- Running under PM2 as `tracking` on **port 3001** (3000 and 4000 are taken by the numu apps).
- Nginx: `/etc/nginx/sites-available/tracking`, `server_name rt.addsmint.com` → `proxy_pass http://localhost:3001`, symlinked and reloaded, `nginx -t` clean.
- **SSL live.** `certbot --nginx -d rt.addsmint.com` succeeded and added the `listen 443 ssl` block. `certbot renew --dry-run` shows `rt.addsmint.com` **succeeding**. (A different cert on the same box, `api.numu.com.pk`, fails renewal because its own DNS record no longer exists — a numu-app problem, not ours, deliberately untouched.)
- `curl -I https://rt.addsmint.com` → `307` to `/dashboard` with `X-Powered-By: Next.js`, over HTTPS.

### Database — 4 migrations exist locally, 0 applied to the VPS, only 3 are pushed
| Migration | Adds | Pushed? | On VPS? |
|---|---|---|---|
| `20260809000000_manual_schema_sync` | 4 missing tables (`purchase_invoices`, `supplier_payments`, `fund_transfers`, `installation_devices`) + columns on `installations` (`received`, `sim_no`, `discount`, `amount_paid`), `devices` (`quantity`, `sale_price`), `accounts` (`opening_balance`), `suppliers` (`address`, `opening_owed`), and `installations.total_amount` recreated as `GENERATED ALWAYS AS ... STORED` | ✅ | ❌ |
| `20260818000000_installation_other_amount` | `installations.other_amount` | ✅ | ❌ |
| `20260818010000_installation_device_reference` | `installations.gsm_no`, `fm_module`, `cut_off`, `imei_no` | ✅ | ❌ |
| `20260827000000_device_type` | `devices.type` (`"device"`\|`"sim"`, default `'device'`), backfills `type='sim'` for the one row named "sim" | ❌ **not committed** | ❌ |

All four are required — the app queries these columns on nearly every page. **The 4th is not yet committed** — see §3.

### Still open (after deploying)
- Admin login is **not seeded on the VPS**. Default in `prisma/seed.ts` is `admin@trackfleet.com` / `Admin@123`. That password is hardcoded in a **public** GitHub repo — user has been told twice and chose to keep it for now. Change it before seeding if that changes.

## 3. Active Files

`f1393e9` (pushed) covers CSV import parity, the New Installation form additions, server-side pagination, Renewals filters, and Installations search/pay. Everything below is **uncommitted**, sitting on top of it:

- Schema/migration: `prisma/schema.prisma` (`Device.type` field), `prisma/migrations/20260827000000_device_type/`.
- Stock "Faulty" removal: `app/(app)/stock/page.tsx`, `components/stock/StockView.tsx`, `components/stock/EditDeviceModal.tsx`, `actions/devices.ts`, `lib/validations/device.ts`, `app/(app)/suppliers/page.tsx` (device picker narrowed to `in_stock` only).
- CSV stock-decrement fix + Device/Sim type: `lib/devices.ts` (`resolveNamedStockLine` → `resolveStockLineByType`), `lib/csv-import.ts` (Device Qty / Sim Qty columns), `lib/validations/import.ts`, `actions/import.ts`, `lib/installation-write.ts`, `components/installations/ImportCsvModal.tsx`.
- Add Device Type dropdown + top-up-not-split behavior: `components/stock/AddDeviceModal.tsx`, `actions/devices.ts`, `lib/validations/device.ts`.
- Payment-method-optional rule: `lib/accounts.ts` (`resolvePayingAccount` gained `direction`), `actions/installations.ts`, `actions/customers.ts`, `components/installations/NewInstallationModal.tsx`, `components/customers/InstallationBlockFields.tsx`.
- New Installation form trim (Phone/Sim/Amount Device/Sim Number removed): `components/installations/NewInstallationModal.tsx`.
- Sales Report (new module): `app/(app)/sales-report/page.tsx`, `components/sales/SalesReportView.tsx`, sidebar entry in `components/layout/Sidebar.tsx` (placed under Renewals).
- Docs: `context/progress-tracker.md`, `context/ui-registry.md` — all current, describe everything above in detail.

Files from the *previous* uncommitted batch that are now safely in `f1393e9` (no longer active): `lib/pagination.ts`, `components/ui/Pagination.tsx`, `lib/renewals-query.ts`, and the pagination `page.tsx`/`*View.tsx` pairs.

## 4. Changes Made

**In `f1393e9` (pushed):** schema drift fix (see progress-tracker.md for the full story — the dev DB had years of hand-applied changes never captured as migrations, fixed via `prisma migrate diff` against the real dev DB + a hand-fixed `GENERATED ALWAYS` column), full CSV import column parity, New Installation modal additions (Phone/Amount Device/More details), server-side pagination on 5 pages, Renewals filter simplification, Installations search + Pay Remaining. Full detail in `context/progress-tracker.md`'s earlier entries — not repeated here.

**Since then (uncommitted), in the order it happened:**

1. **Stock: Faulty removed entirely.** Stock page now queries `status: "in_stock"` only — no more filter tabs, no Status column. `EditDeviceModal` is purely a price editor; `updateDevice` no longer touches `status` at all (nothing in the org had any faulty/returned rows, confirmed before removing).
2. **Payment Method made optional on installations.** Required only when `total > 0 && amountPaid > 0` — a zero-total installation never asks for one, even if Amount Paid is somehow non-zero. Reused the existing `resolvePayingAccount` (built for supplier invoices) rather than writing new logic; gave it a `direction` param so the refusal message reads correctly both ways.
3. **New Installation form trimmed.** Removed Phone, Sim, Amount Device, Sim Number. Amount now carries the whole job alone. `InstallationBlockFields` (Add Customer page) was **not** trimmed — it still has Sim/Sim Number, deliberately, since that form's own scope wasn't part of the ask.
4. **Found and fixed: CSV import never actually decremented Stock.** It matched/created devices by IMEI, but real stock is two bulk pools with no IMEI at all. New template columns **Device Qty** / **Sim Qty** (plain counts) now draw from those pools through the same `moveStock` mechanism the New Installation form uses — idempotent on re-import. IMEI (and GSM Numbar/FM Mudule/Cut Off, which used to be metadata on the now-deleted per-IMEI device) became plain reference text on the installation.
5. **`Device.type` column added** (`"device"` | `"sim"`) so pool identity no longer depends on the literal string "tracker"/"sim" matching. Add Device gained a required Type dropdown; adding a second line of a type that already exists **tops up that same pool** rather than creating a second one (confirmed with the user: exactly one Device pool + one Sim pool per org, always). Stock's stats became **Device units** / **Sim units** (`groupBy(["type"])`), and the table gained a Type badge column.

**Sales Report module (new, `/sales-report`)** — per-installation earnings: Client / Reg No / Install Date / Sim / Device / Other, under four KPI cards (Others leads, then SIM total, Device total, installation count). Sidebar entry sits in Main, directly under Renewals. Date range reuses the Renewals GET-form pattern and shared `Pagination`; KPIs come from `aggregate()` across the whole range, not the visible page. **"Other" is computed as `total − sim − device`, not the stored `installations.other_amount`** — the two disagree on existing rows (BHN-058 stores 2000, computes 8000), intentionally: the stored column is what CSV import writes and was left untouched. **No schema change** for this one.

## 5. Failed Attempts / Gotchas Hit

- **"Login doesn't work" on the VPS was not an auth bug.** PM2 logs showed `PrismaClientKnownRequestError: The column installations.received does not exist`. Root cause was the schema drift above. Still unresolved on the VPS until §6 runs.
- **Stale Prisma client in a long-running dev server.** After adding the device-reference migration, the local dev server threw `Unknown argument 'imeiNo'` even though the generated client on disk was correct — the process had the old client in memory. Fixed by restarting it. **Expect the same on the VPS: run `npx prisma generate` before `pm2 restart`.**
- `prisma migrate dev` wanted to **reset the dev database** because of the drift; refused and hand-wrote the migration instead.
- `prisma migrate diff` needs a `shadowDatabaseUrl` in `prisma.config.ts` — added temporarily, then reverted. A scratch `tracking_shadow` DB was created and dropped.
- Earlier deploy-session issues, all resolved: PM2 crash-looping before `.env.local`/build existed; `next: not found` from an incomplete `node_modules`; `.env.local` written to `/var/www` instead of `/var/www/tracking`; a Postgres password mismatch; SQL pasted into bash instead of an open `psql` session.
- Test-only DB writes during verification were all either done in rolled-back transactions or explicitly restored afterward (a Rs 400 payment on BHN-502 was recorded then reverted to its original 13,000; two installations were backdated to test renewal statuses then restored; a real CSV import through the actual UI and a real Sim top-up through the actual Add Device form each moved real stock quantities, both confirmed and then restored to baseline — tracker 195, sim 10).
- Same stale-Prisma-client symptom recurred **twice more** this session after adding the `Device.type` migration and again after the earlier ones — each time the running dev server needed a restart before `npx tsc`/the browser would stop throwing `Unknown argument` errors. This is now a confirmed recurring pattern after any migration, not a one-off.
- Two test scripts briefly touched `.env.local` to redirect `AUTH_URL` at a second port (this project's own dev server was already occupying 3000 in one case, and a different unrelated project — `Star-Panaflex` — was occupying it in another). Both times the file was restored and diffed byte-identical against a backup afterward. Eventually just reused the project's own already-running server on 3000 instead of juggling a second instance, which is simpler going forward.

## 6. Next Step

1. **Commit and push everything since `f1393e9`** (§3 lists exactly what's uncommitted) — nothing past that commit exists on GitHub yet, so `git pull` on the VPS alone will not bring any of §4's items 1–5 or Sales Report over.
2. **Then deploy**, on the VPS in `/var/www/tracking`:

```bash
git pull origin master
npm ci
npx prisma generate      # do NOT skip — stale client causes "Unknown argument" errors
npx prisma migrate deploy # must apply all FOUR migrations
npm run build
pm2 restart tracking
```

Then verify:

```bash
pm2 logs tracking --lines 30 --nostream   # want "✓ Ready", no prisma:error / ColumnNotFound
```

Seed the admin so login works (nothing has been seeded on the VPS yet):

```bash
npx prisma db seed        # creates admin@trackfleet.com / Admin@123
```

Then in a browser at `https://rt.addsmint.com`:
1. Log in — should now work (the earlier failure was the missing `installations.received` column, not credentials).
2. Installations → search a plate or IMEI → confirm the lookup card renders with Contact Information / Car Description.
3. Expand a row → confirm the same card + "Pay remaining" button.
4. Renewals → confirm Pending/Received/All tabs and the due-date range.
5. Stock → confirm no Faulty tab, Type column shows Device/Sim, stats read "Device units"/"Sim units".
6. Sales Report (sidebar, under Renewals) → loads with KPIs and the date range.
7. Import a small CSV with Device Qty/Sim Qty filled in → confirm Stock's Device/Sim units actually move.

**If `migrate deploy` reports "No pending migrations", stop and investigate** — it should apply four.

## 7. Known Issues / Deliberate Non-Goals

- **Payments don't move account balances.** `payment-methods/page.tsx` computes balances from an installation's `totalAmount`, not `amountPaid`, so recording a payment updates the installation's paid/remaining and its Received pill but not the account balance. Pre-existing modelling quirk, deliberately not changed — worth a decision.
- `Admin@123` is hardcoded in `prisma/seed.ts` in a public repo (user's call to keep for now).
- `api.numu.com.pk` cert renewal fails on this box — unrelated numu app, left alone.
- Worth writing a `deploy.sh` once §6 is confirmed working end to end.
