# Architecture — Vehicle Tracking Management

A web application for a **GPS vehicle-tracking device installation business**. It replaces the team's current Excel workbook (`Data entry` + `Renwal` sheets) with a structured system covering customers, their vehicles, installed tracking devices, installation payments, renewals, suppliers, stock, expenses, and reports.

> **Source of truth for the data model:** the existing `Deta_Entry.xlsx`. Every field the team already records is preserved. Spelling is corrected in the schema (e.g. `Installetion → installation`, `Paymint → payment`, `Accunt → account`) but no field is dropped.

## Stack

| Layer        | Tool                        | Purpose                                    |
| ------------ | --------------------------- | ------------------------------------------ |
| Framework    | Next.js 16 (App Router)     | Full-stack framework, RSC + Server Actions |
| Database     | PostgreSQL 16               | Primary data store                         |
| ORM          | Prisma                      | Type-safe DB access + migrations           |
| Auth         | Auth.js (NextAuth) + JWT    | Sessions                                   |
| Styling      | Tailwind CSS + shadcn/ui    | UI components and styling                  |
| Validation   | Zod                         | Input + API schema validation              |
| Charts       | Recharts                    | Reports + dashboard analytics              |
| Import       | SheetJS (xlsx)              | One-time + ongoing Excel import            |
| Jobs/Cron    | Vercel Cron                 | Renewal due-date reminders                 |
| Language     | TypeScript (strict)         | Throughout                                 |

---

## How the Excel maps to modules

| Sidebar module   | Route              | Backed by                                              |
| ---------------- | ------------------ | ----------------------------------------------------- |
| Dashboard        | `/dashboard`       | KPIs across installations, renewals, revenue, expenses |
| Customers        | `/customers`       | `customers` + their `contacts`                         |
| Suppliers        | `/suppliers`       | `suppliers` (device + SIM sourcing)                    |
| Stock            | `/stock`           | `devices` inventory (trackers, SIMs) before install    |
| Reports          | `/reports`         | Aggregates from `installations`, `renewals`, `expenses`|
| Renewal          | `/renewals`        | `renewals` (the `Renwal` sheet)                        |
| Payment Methods  | `/payment-methods` | `accounts` (the "Accunt" column — easy mukhlis, etc.)  |
| Expense          | `/expenses`        | New module — not in Excel                              |

**The core entity is an `installation`** — the `Data entry` sheet. One installation links a customer, a vehicle, a device, the install date, and the four-part payment breakdown.

---

## Folder Structure

```
/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── app/
│   ├── layout.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx                       → Sidebar + topbar shell
│   │   ├── dashboard/page.tsx
│   │   ├── customers/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx                → Customer + vehicles + installs
│   │   ├── installations/
│   │   │   ├── page.tsx                     → All installations (Data entry)
│   │   │   ├── new/page.tsx                 → New installation form
│   │   │   └── [id]/page.tsx                → Full record + renewals history
│   │   ├── suppliers/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── stock/
│   │   │   ├── page.tsx                     → Devices + SIMs inventory
│   │   │   └── [id]/page.tsx
│   │   ├── renewals/page.tsx                → Renwal sheet
│   │   ├── payment-methods/page.tsx         → Accounts
│   │   ├── expenses/page.tsx
│   │   ├── reports/page.tsx
│   │   └── import/page.tsx                  → Upload Deta_Entry.xlsx
│   └── api/
│       ├── auth/[...nextauth]/route.ts
│       ├── import/route.ts                  → Parse + ingest Excel
│       ├── renewals/remind/route.ts         → Cron: flag due renewals
│       └── reports/[type]/route.ts
├── actions/
│   ├── customers.ts
│   ├── installations.ts
│   ├── renewals.ts
│   ├── suppliers.ts
│   ├── devices.ts
│   ├── accounts.ts
│   └── expenses.ts
├── components/
│   ├── ui/                                  → shadcn/ui only
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   └── PageHeader.tsx
│   ├── dashboard/
│   │   ├── StatsBar.tsx
│   │   ├── RevenueChart.tsx
│   │   ├── UpcomingRenewals.tsx
│   │   └── RecentInstallations.tsx
│   ├── customers/
│   │   ├── CustomerTable.tsx
│   │   ├── CustomerForm.tsx
│   │   └── ContactFields.tsx                → Up to 4 contacts
│   ├── installations/
│   │   ├── InstallationTable.tsx
│   │   ├── InstallationForm.tsx             → Mirrors Data entry columns
│   │   ├── VehicleFields.tsx
│   │   ├── DeviceFields.tsx
│   │   └── PaymentBreakdown.tsx
│   ├── renewals/
│   │   ├── RenewalTable.tsx
│   │   ├── RenewalForm.tsx
│   │   └── RenewalStatusPill.tsx
│   ├── suppliers/
│   ├── stock/
│   ├── payment-methods/
│   ├── expenses/
│   ├── reports/
│   └── import/
│       └── ExcelImporter.tsx
├── lib/
│   ├── prisma.ts
│   ├── auth.ts
│   ├── excel-import.ts                       → Column mapping + row parsing
│   ├── validations/
│   ├── reports.ts
│   └── utils.ts
└── types/
    └── index.ts
```

---

## System Boundaries

| Folder        | Owns                                                                   |
| ------------- | --------------------------------------------------------------------- |
| `app/`        | Pages and API routes only. No business logic.                         |
| `actions/`    | Server Actions for UI mutations. All writes go here or via API routes.|
| `components/` | UI only. No direct DB calls in client components.                     |
| `lib/`        | Client init, Excel mapping, validation, query helpers.               |
| `prisma/`     | Schema + migrations. Single source of truth for the data model.      |
| `types/`      | Shared TypeScript types.                                              |

---

## Data Flow

### New Installation (Server Action)

```
Staff fills Installation form (customer, vehicle, device, payments)
        ↓
actions/installations.ts → Zod validation
        ↓
Transaction:
  upsert customer + contacts
  upsert vehicle
  mark device as installed (stock out)
  insert installation with payment breakdown
  link account used
        ↓
revalidatePath('/installations')
```

### Renewal (Server Action)

```
Staff opens an installation due for renewal → records renewal
        ↓
actions/renewals.ts
        ↓
Insert renewal (amount, sim_osting, net, other, account, received flag)
Advance installation.next_renewal_date by 1 year
        ↓
revalidatePath('/renewals')
```

### Excel Import (API Route)

```
Admin uploads Deta_Entry.xlsx on /import
        ↓
/api/import → SheetJS parses 'Data entry' + 'Renwal' sheets
        ↓
lib/excel-import.ts maps columns → entities (dedupe by Registration No)
        ↓
Per row, in a transaction: upsert customer/vehicle/device/installation
Renwal rows matched to installations by Registration No
        ↓
Returns import summary { inserted, skipped, errors[] }
```

### Renewal Reminders (Cron)

```
Vercel Cron → /api/renewals/remind daily
        ↓
Find installations where next_renewal_date within 30 days
        ↓
Create notification rows (renewal_due)
```

---

## PostgreSQL Schema

> Every tenant table carries `org_id` and all queries are scoped to it.
> Field names in **parentheses** show the original Excel header.

### `customers`  *(from Data entry: Client Name, Address, Password, Remarks)*

| Column     | Type        | Notes                          |
| ---------- | ----------- | ------------------------------ |
| id         | uuid        | PK                             |
| org_id     | uuid        | FK → organizations             |
| name       | text        | (Client Name)                  |
| address    | text        | (Address)                      |
| password   | text        | (Password) — client portal/app login the team stores |
| remarks    | text        | (Remarks)                      |
| created_at | timestamptz |                                |

### `contacts`  *(Contact 1–4 + Mobile Number)*

| Column      | Type        | Notes                         |
| ----------- | ----------- | ----------------------------- |
| id          | uuid        | PK                            |
| customer_id | uuid        | FK → customers                |
| name        | text        | (Contact N)                   |
| mobile      | text        | (Mobile Number)               |
| position    | smallint    | 1–4, order shown in Excel     |

### `vehicles`  *(Registration No, Car Description, Make, Model, Engine/Chassis, Colour)*

| Column          | Type        | Notes                       |
| --------------- | ----------- | --------------------------- |
| id              | uuid        | PK                          |
| org_id          | uuid        | FK → organizations          |
| customer_id     | uuid        | FK → customers              |
| registration_no | text        | (Registration No) — unique per org, e.g. BHN-058 |
| description     | text        | (Car Description) e.g. Toyota Innova |
| make            | text        | (Make)                      |
| model           | text        | (Model)                     |
| engine_no       | text        | (Engine Number)             |
| chassis_no      | text        | (Chassis Number)            |
| colour          | text        | (Colour)                    |
| created_at      | timestamptz |                             |

### `devices` (Stock)  *(GSM Number, IMEI Number, FM Module, Cut OFF)*

| Column        | Type        | Notes                                       |
| ------------- | ----------- | ------------------------------------------- |
| id            | uuid        | PK                                          |
| org_id        | uuid        | FK → organizations                          |
| supplier_id   | uuid        | FK → suppliers (nullable)                   |
| imei_no       | text        | (IMEI Number) — unique                      |
| gsm_no        | text        | (GSM Number) — primary SIM number           |
| gsm_no_alt    | text        | (GSM Numbar) — second SIM column in sheet   |
| fm_module     | text        | (FM Mudule) e.g. AOT120                      |
| cut_off       | text        | (Cut OFF) — engine cut-off capability/flag  |
| status        | text        | in_stock / installed / faulty / returned    |
| cost_price    | numeric(12,2)| Purchase cost                              |
| created_at    | timestamptz |                                             |

### `installations`  *(the Data entry sheet — the core record)*

| Column            | Type        | Notes                                          |
| ----------------- | ----------- | ---------------------------------------------- |
| id                | uuid        | PK                                             |
| org_id            | uuid        | FK → organizations                             |
| customer_id       | uuid        | FK → customers                                 |
| vehicle_id        | uuid        | FK → vehicles                                  |
| device_id         | uuid        | FK → devices                                   |
| account_id        | uuid        | FK → accounts (Accunt — "multiple accounts" etc.)|
| installation_date | date        | (Installetion Date)                            |
| installation_pay  | numeric(12,2)| (Instalition Pay)                             |
| sim_payment       | numeric(12,2)| (Sim Paymint)                                 |
| device_payment    | numeric(12,2)| (Device paymint)                              |
| net_payment       | numeric(12,2)| (Net Paymint)                                 |
| total_amount      | numeric(12,2)| Generated = install + sim + device + net      |
| next_renewal_date | date        | Default install_date + 1 year                  |
| status            | text        | active / suspended / removed                   |
| created_at        | timestamptz |                                                |

### `renewals`  *(the Renwal sheet)*

| Column           | Type        | Notes                                  |
| ---------------- | ----------- | -------------------------------------- |
| id               | uuid        | PK                                     |
| org_id           | uuid        | FK → organizations                     |
| installation_id  | uuid        | FK → installations (matched by reg no) |
| account_id       | uuid        | FK → accounts (Accunt)                 |
| received         | boolean     | (received) — "Received" → true         |
| amount           | numeric(12,2)| (amount)                              |
| sim_osting       | numeric(12,2)| (Sim and Osting)                      |
| net              | numeric(12,2)| (net)                                  |
| other            | numeric(12,2)| (other)                               |
| other_note       | text        | (other note: transfar / replace…)      |
| renewed_at       | date        |                                        |
| next_renewal_date| date        | Advances 1 year on renewal             |
| created_at       | timestamptz |                                        |

### `accounts` (Payment Methods)  *(the Accunt column)*

| Column     | Type        | Notes                                        |
| ---------- | ----------- | -------------------------------------------- |
| id         | uuid        | PK                                           |
| org_id     | uuid        | FK → organizations                           |
| name       | text        | e.g. "multiple accounts", "easy mukhlis"     |
| type       | text        | bank / easypaisa / jazzcash / cash / multiple|
| details    | jsonb        | Optional account number / wallet ref        |
| is_active  | boolean     |                                              |
| created_at | timestamptz |                                              |

### `suppliers`

| Column        | Type        | Notes                    |
| ------------- | ----------- | ------------------------ |
| id            | uuid        | PK                       |
| org_id        | uuid        | FK → organizations       |
| name          | text        |                          |
| contact_name  | text        |                          |
| phone         | text        |                          |
| supplies      | text        | devices / sims / both    |
| status        | text        | active / inactive        |
| created_at    | timestamptz |                          |

### `expenses` (new module)

| Column        | Type        | Notes                                   |
| ------------- | ----------- | --------------------------------------- |
| id            | uuid        | PK                                      |
| org_id        | uuid        | FK → organizations                      |
| category      | text        | salaries / rent / fuel / device_purchase / sim / misc |
| description   | text        |                                         |
| amount        | numeric(12,2)|                                        |
| account_id    | uuid        | FK → accounts (nullable)                |
| supplier_id   | uuid        | FK → suppliers (nullable)               |
| spent_at      | date        |                                         |
| receipt_url   | text        | Optional                                |
| created_by    | uuid        | FK → users                              |
| created_at    | timestamptz |                                         |

### `organizations` / `users`

Standard multi-tenant auth tables (`organizations`: id, name; `users`: id, org_id, full_name, email, password_hash, role owner/manager/staff).

### `notifications`

| Column     | Type        | Notes                            |
| ---------- | ----------- | -------------------------------- |
| id         | uuid        | PK                               |
| org_id     | uuid        | FK → organizations               |
| type       | text        | renewal_due / low_stock          |
| message    | text        |                                  |
| entity_id  | uuid        | Related installation / device    |
| is_read    | boolean     |                                  |
| created_at | timestamptz |                                  |

---

## Key Relationships

```
customers 1─* contacts
customers 1─* vehicles
customers 1─* installations
vehicles  1─* installations
devices   1─1 installations        (a device is installed once)
accounts  1─* installations
installations 1─* renewals
suppliers 1─* devices
accounts  1─* renewals / expenses
```

---

## Excel Column → Field Map (import reference)

**Sheet `Data entry`:**

| Excel header        | Goes to                          |
| ------------------- | -------------------------------- |
| Client Name         | customers.name                   |
| Registration No     | vehicles.registration_no         |
| Installetion Date   | installations.installation_date  |
| Contact 1–4 + Mobile| contacts (position 1–4)          |
| Remarks             | customers.remarks                |
| Address             | customers.address                |
| Password            | customers.password               |
| Car Description     | vehicles.description             |
| Make / Model        | vehicles.make / model            |
| Engine / Chassis    | vehicles.engine_no / chassis_no  |
| Cut OFF             | devices.cut_off                  |
| Colour              | vehicles.colour                  |
| GSM Number / Numbar | devices.gsm_no / gsm_no_alt      |
| IMEI Number         | devices.imei_no                  |
| FM Mudule           | devices.fm_module                |
| Instalition Pay     | installations.installation_pay   |
| Sim Paymint         | installations.sim_payment        |
| Device paymint      | installations.device_payment     |
| Net Paymint         | installations.net_payment        |
| Accunt              | accounts.name → installations.account_id |

**Sheet `Renwal`:** Client Name + Registration No → match installation; received / amount / Accunt / Sim and Osting / net / other → renewals.*

---

## Authentication

- Provider: Auth.js (NextAuth) — Credentials, JWT strategy with `org_id` + `role`
- Protected: everything under `app/(app)/`; public: `/`, `/login`, `/register`
- Middleware validates session on protected routes; redirect to `/login` if absent

---

## Cron Jobs

| Schedule    | Endpoint                  | Action                                  |
| ----------- | ------------------------- | --------------------------------------- |
| Daily 02:00 | `/api/renewals/remind`    | Flag installations renewing in ≤30 days |

Protected by `CRON_SECRET` bearer header.

---

## Invariants

- Components contain no DB logic. API routes and Server Actions contain no UI logic.
- Every Prisma query is scoped by `org_id`.
- `vehicles.registration_no` is unique per org — it's the natural key used to match Excel rows and renewals.
- `devices.imei_no` is unique — a device is installed on exactly one vehicle at a time.
- An installation's payment columns mirror the Excel exactly: installation_pay, sim_payment, device_payment, net_payment; `total_amount` is generated, never hand-edited.
- Renewal rows never edit the original installation's payments — they are separate records linked by `installation_id`.
- Renewal dates advance only via the renewal action or import, never silently.
- All monetary columns use `numeric(12,2)` — never `float`.
- Import is idempotent: re-importing the same workbook upserts by registration_no and imei_no, never duplicates.
- No hardcoded hex/colors in components — use design tokens.