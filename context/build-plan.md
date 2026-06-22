# Build Plan

## Core Principle

Full page UI built with mock data first — verified visually against the prototype before any logic is written. Then functionality is built and wired to the UI step by step. Every feature must be visible and testable before moving to the next. No invisible backend phases.

The approved prototype (light theme, blue accent, all 8 modules) is the visual source of truth. Every screen below should match it before logic is added.

---

## Phase 1 — Foundation

### 01 Project Setup

Scaffold the app shell so every later screen has a consistent frame.

**UI:**

- Sidebar — logo, grouped nav (Main: Dashboard, Customers, Installations, Renewals · Inventory: Stock, Suppliers · Finance: Payment Methods, Expenses, Reports), active-item pill, user card pinned bottom
- Topbar — page title + subtitle, search field, notification bell
- Protected `(app)` layout wrapping all module pages
- Fonts (Sora, Inter, JetBrains Mono) and ui-tokens.md wired into globals.css

**Logic:**

- Next.js 16 App Router, Tailwind v4, shadcn/ui, TypeScript strict
- Tokens from ui-tokens.md defined in `@theme`
- Nav active state driven by current route

---

### 02 Auth

Auth.js authentication — credentials + JWT.

**UI:**

- Login page — email + password, sign in button
- Register page — name, email, password

**Logic:**

- Auth.js (NextAuth) Credentials provider, JWT strategy
- `orgId` and `role` embedded in the token
- Middleware protecting every `(app)` route
- After login → redirect to /dashboard
- Logout clears session

---

### 03 Database Schema

All PostgreSQL tables created before any data is written.

**Logic:**

- Prisma schema with all models from architecture.md: organizations, users, customers, contacts, vehicles, devices, accounts, suppliers, installations, renewals, expenses, notifications
- First migration applied
- `total_amount` generated column added via follow-up migration (total_amount.sql)
- Unique constraints: vehicles (orgId + registrationNo), devices (orgId + imeiNo)
- Every query scoped by orgId — enforced as a convention from day one

---

### 04 Excel Import

Load the team's existing Deta_Entry.xlsx so the rest of the app is built against real records.

**UI:**

- /import page — drag and drop upload area, "Click to upload or drag and drop", .xlsx only note, Import button
- Import summary panel — inserted / skipped / errors counts, error rows listed

**Logic:**

- POST /api/import — SheetJS parses 'Data entry' + 'Renwal ' sheets (note trailing space)
- lib/excel-import.ts maps original headers to clean fields per architecture.md
- Per-row transaction: upsert customer + contacts + vehicle + device + installation
- Renwal rows matched to installations by registrationNo
- Idempotent: re-import upserts by registrationNo / imeiNo, never duplicates
- Unmatched renewal rows returned in the error summary, never dropped

---

## Phase 2 — Customers & Installations

### 05 Customers Page — Full UI

Build the complete customers UI with mock data. No save logic yet.

**UI:**

- Toolbar — All / Active / Inactive segmented filter, Import Excel, Add customer button
- Customers table — avatar + name + contact count, primary contact, vehicles count, active installs count, address, status pill
- Customer detail — personal info, up to 4 contacts, their vehicles, their installations list

---

### 06 Customer Save Logic

Wire the customer form and contacts to the DB.

**Logic:**

- Server Action in actions/customers.ts saves name, address, password, remarks
- Up to 4 contacts saved with position 1–4
- Form pre-fills with existing data on edit
- Status derived from active installs
- revalidatePath('/customers') after save

---

### 07 Installations Page — Full UI

Build the complete installations UI with mock data. This is the core record.

**UI:**

- Toolbar — All / Active / Suspended filter, Import Excel, New installation button
- Installations table — client, vehicle, reg no, IMEI (truncated), install date, total, account chip, status pill
- Installation detail card — device fields grid (IMEI, GSM, FM module, engine/chassis, colour, cut-off, next renewal, account) + payment breakdown as mini-stats (installation / SIM / device / net / total)
- New installation form — customer, vehicle, device, account selectors + four payment fields

---

### 08 Installation Save Logic

Wire the installation form to the DB.

**Logic:**

- Server Action in actions/installations.ts, Zod validated
- Transaction: upsert customer + vehicle, set device status to installed, insert installation
- next_renewal_date defaulted to install date + RENEWAL_MONTHS
- total_amount read from the generated column — never written
- revalidatePath('/installations') after save

---

## Phase 3 — Inventory

### 09 Stock Page — Full UI

Build the complete devices/stock UI with mock data.

**UI:**

- Toolbar — All / In stock / Installed / Faulty filter, Add device button
- Status summary cards — In stock, Installed, Faulty, Returned counts
- Devices table — IMEI, GSM number, FM module, supplier, cost, status pill

---

### 10 Stock Logic

Wire device records and status transitions to the DB.

**Logic:**

- Server Action in actions/devices.ts — add device, edit, change status
- Status transitions: in_stock → installed (on install) → faulty / returned
- Devices linked to supplier
- Low-stock count surfaced to the dashboard
- revalidatePath('/stock') after change

---

### 11 Suppliers Page — Full UI + Logic

Build suppliers UI with mock data, then wire it.

**UI:**

- Toolbar — Add supplier button
- Supplier cards — name, what they supply, contact, phone, lead time, devices/SIMs supplied count

**Logic:**

- Server Action in actions/suppliers.ts — add, edit, deactivate
- Supplied-count derived from linked devices
- revalidatePath('/suppliers') after save

---

## Phase 4 — Finance

### 12 Payment Methods Page — Full UI + Logic

Build the accounts UI with mock data, then wire it.

**UI:**

- Toolbar — Add account button
- Account cards — name, type (bank / EasyPaisa / JazzCash / cash / multiple), masked details, transaction count, default flag

**Logic:**

- Server Action in actions/accounts.ts — add, edit, set default, deactivate
- Transaction count derived from installations + renewals + expenses using the account
- revalidatePath('/payment-methods') after save

---

### 13 Renewals Page — Full UI

Build the complete renewals UI with mock data.

**UI:**

- Toolbar — Due soon / Received / Overdue / All filter, Record renewal button
- Renewals table — client, reg no, due date, amount, SIM & osting, net, other, account chip, status pill (received / due in Nd / overdue Nd / upcoming)
- Sorted by urgency — overdue and due-soon first

---

### 14 Renewal Logic + Reminder Cron

Wire renewals to the DB and add the reminder job.

**Logic:**

- Server Action in actions/renewals.ts — record renewal (amount, sim_osting, net, other, account, received)
- Advance installation.next_renewal_date by RENEWAL_MONTHS
- Renewal never edits the original installation's payments
- Cron GET /api/renewals/remind (CRON_SECRET) — flag installations renewing within RENEWAL_REMINDER_DAYS, create renewal_due notifications
- revalidatePath('/renewals') after record

---

### 15 Expenses Page — Full UI + Logic

Build the expenses UI with mock data, then wire it.

**UI:**

- Toolbar — This month / Quarter / Year filter, Add expense button
- Recent expenses table — category pill, description, account, date, amount
- By-category breakdown bars + total this month
- Add expense form — category, description, amount, account, supplier (optional), date, receipt upload

**Logic:**

- Server Action in actions/expenses.ts, Zod validated
- Linked to account and optional supplier
- revalidatePath('/expenses') after save

---

## Phase 5 — Dashboard & Reports

### 16 Dashboard Page — Full UI

Build the complete dashboard UI with mock data.

**UI:**

- Time-range segmented control (Today / This month / Quarter / Year), Export, New installation
- Four KPI cards: Active installations, Revenue this month, Renewals due (30d), Devices in stock — trend badges + sparklines
- Revenue & renewals chart — installations line/area vs renewals line
- Top vehicle makes — horizontal breakdown bars
- Recent installations table + Activity feed

---

### 17 Dashboard — Real Data

Wire KPIs, tables, and activity feed to the DB.

**Logic:**

- Active installations — COUNT installations where status = active, scoped to orgId
- Revenue this month — SUM total_amount of installations + renewal amounts this month
- Renewals due (30d) — COUNT installations renewing within RENEWAL_REMINDER_DAYS
- Devices in stock — COUNT devices where status = in_stock
- Recent installations — latest 4–5 by installation_date
- Activity feed — merge recent installations, renewals received, due-soon flags, stock received; sort by time, take last 5
- Top vehicle makes — group installed vehicles by make

---

### 18 Reports Page — Full UI + Aggregations

Build the reports UI with mock data, then wire aggregations.

**UI:**

- Report-type segmented control (Sales / Revenue / Renewals / Expenses), Export PDF
- Summary stat cards — total revenue YTD, renewal income YTD, expenses YTD, net profit YTD
- Revenue vs expenses chart — monthly grouped bars
- Filterable by date range

**Logic:**

- lib/reports.ts aggregation helpers (Prisma groupBy / raw SQL)
- Revenue = installations.total_amount + renewals; expenses from expenses table
- Net profit = revenue − expenses
- All scoped to orgId and the selected range
- Charts rendered with recharts; empty state when no data

---

## Feature Count

| Phase                          | Features |
| ------------------------------ | -------- |
| Phase 1 — Foundation           | 4        |
| Phase 2 — Customers & Installs | 4        |
| Phase 3 — Inventory            | 3        |
| Phase 4 — Finance              | 4        |
| Phase 5 — Dashboard & Reports  | 3        |
| **Total**                      | **18**   |