# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 3–4 — Core Records + Renewals
**Last completed:** 15 Payment Methods Page (full UI + save logic)
**Next:** 19 Expenses Page

---

## Progress

### Phase 1 — Foundation

- [x] 01 Project Setup — Next.js 16, Tailwind v4, TypeScript strict, design tokens, Sidebar, Topbar, PageHeader, (app) shell
- [x] 02 Auth — Auth.js Credentials+JWT, proxy.ts route protection, login + register pages, bcrypt, Zod validation
- [x] 03 Database Schema — full_schema migration (customers, contacts, vehicles, devices, suppliers, accounts, installations, renewals, expenses, notifications); total_amount converted to GENERATED ALWAYS AS via db execute
- [x] 04 Generated total_amount Column — follow-up migration applied
- [ ] 05 App Shell — Sidebar, Topbar, PageHeader, protected layout

### Phase 2 — Data Migration

- [ ] 06 Excel Import — Full UI (/import upload screen)
- [ ] 07 Column Mapping — lib/excel-import.ts (Data entry + Renwal sheets)
- [ ] 08 Import API + Idempotent Upsert — match by registration_no / imei_no

### Phase 3 — Core Records

- [x] 09 Customers Page — Full UI (table + filter + avatar + status pills + empty state)
- [x] 10 Customer Save Logic — actions/customers.ts, Zod validation, slide-in drawer; row ⋯ dropdown (View ledger, Pay, Edit); 11-digit phone validation
- [x] 11 Installations Page — Full UI (table with expandable detail panel + New Installation modal, batch device entry, auto-fill renewal date)
- [x] 12 Installation Save Logic — batch upsert vehicle/device per-row + installation.create; shared installationDate + nextRenewalDate
- [x] 13 Stock (Devices) Page — Full UI (stats cards, filter tabs All/In stock/Installed/Faulty, table with IMEI/GSM/FM Module/Supplier/Cost/Sale Price/Status, Add device drawer with IMEI + name + cost + sale price); salePrice column added via direct SQL migration

### Phase 4 — Suppliers, Accounts, Renewals

- [x] 14 Suppliers Page — Full UI + save logic (two tabs: Suppliers/Purchase Invoices; stats; add/edit/delete; pay supplier; new invoice; estPayable computed from openingOwed + invoices - payments)
- [x] 15 Payment Methods (Accounts) Page — Full UI + save logic (method cards with live balance, transfer funds drawer, today's/all transactions, balance = opening + renewals + installations - expenses - supplier payments ± transfers)
- [x] 16 Renewals Page — Full UI (table with status badges, filter tabs Due soon/Received/Overdue/All, per-row Record button, alert banner for due count)
- [x] 17 Renewal Logic — recordRenewal action: creates Renewal record + advances installation.nextRenewalDate +1 year; amounts pre-filled from last renewal or installation payments
- [ ] 18 Renewal Reminder Cron — /api/renewals/remind (≤30 days)

### Phase 5 — Expenses

- [ ] 19 Expenses Page — Full UI
- [ ] 20 Expense Save Logic — actions/expenses.ts (category, account, supplier)

### Phase 6 — Dashboard & Reports

- [ ] 21 Dashboard Page — Full UI (shell + cards)
- [ ] 22 Stats Bar — Real Data (installs, active devices, revenue, due renewals)
- [ ] 23 Upcoming Renewals + Recent Installations — Real Data
- [ ] 24 Revenue Chart — Recharts from installations + renewals
- [ ] 25 Reports Page — Full UI + filters
- [ ] 26 Reports Aggregations — lib/reports.ts (sales, renewals, expenses, inventory)

---

## Decisions Made During Build

_Add decisions here as they are made during implementation._

- Renewal cycle defaults to **yearly** (install_date + 1 year). Revisit if cycles vary.
- `customers.password` stores the client's tracking-app/portal login (as kept in the Excel).
- `customers.phone` added (primary contact number directly on customer, per user request).
- `contacts` table kept but optional — only populated when a customer has named secondary contacts.
- `registration_no` is the natural key used to match Renwal rows to installations on import.
- `total_amount` is a GENERATED ALWAYS AS column — never written from the app. Managed via raw SQL, not Prisma migration.

---

## Notes

_Add notes here as the build progresses — workarounds, patterns, anything that differs from the context files._

- Excel spelling is corrected in the schema (Installetion→installation, Paymint→payment, Accunt→account); original headers documented in architecture.md import map.
- Import must stay idempotent — re-uploading Deta_Entry.xlsx upserts, never duplicates.
- Every Prisma query is scoped by org_id (multi-tenant invariant).