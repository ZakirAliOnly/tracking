# Library Docs

Project-specific usage patterns for every third party library in this project. This file only covers how we use each library in this specific project — rules, patterns, and constraints specific to Vehicle Tracking Management.

Read the relevant section before implementing any feature that touches these libraries.

---

## Before Using Any Library

Before implementing any feature that uses a third party library:

1. **Check AGENTS.md** at the project root — it lists every skill installed for this project and how to use them. Skills contain up-to-date API documentation, usage patterns, and best practices specific to this codebase.

2. **Check if an MCP server is configured** for that library. If an MCP server is available — use it before falling back to general knowledge.

3. **Read this file** for project-specific patterns that override general library knowledge.

The order of authority is:

```
MCP server (real-time docs) → Skills via AGENTS.md → This file (project rules) → General training knowledge
```

Never rely on general training knowledge alone for library APIs — they change frequently and training data may be outdated.

---

## Prisma

**Check first:** Check AGENTS.md for an installed Prisma skill. If a Prisma MCP server is configured — use it. The skill/MCP will have the latest client API and migration patterns.

### Client Singleton

```typescript
// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Rules:**

- Always import the shared `prisma` from `@/lib/prisma` — never call `new PrismaClient()` anywhere else
- Schema lives in `prisma/schema.prisma` — single source of truth for the data model
- Use Prisma's generated types (`Prisma.InstallationGetPayload<...>`) — never hand-write DB row shapes

### Queries — always scoped to org

```typescript
// Read
const installations = await prisma.installation.findMany({
  where: { orgId },
  include: { customer: true, vehicle: true, device: true, account: true },
  orderBy: { installationDate: "desc" },
});

// Single
const installation = await prisma.installation.findFirst({
  where: { id, orgId }, // always include orgId, never id alone
});

// Update
await prisma.renewal.update({
  where: { id },
  data: { received: true },
});
```

**Rules:**

- Every query includes `orgId` in the `where` — never query without an org filter
- Use `findFirst({ where: { id, orgId } })` for single records — never `findUnique({ where: { id } })` alone, so a tenant can't read another tenant's row by id
- Use `include` for relations the page actually renders — never over-fetch
- `Decimal` fields come back as Prisma `Decimal` — convert to number only at the display boundary

### Transactions — multi-entity writes

```typescript
// New installation = customer + vehicle + device + installation, atomic
await prisma.$transaction(async (tx) => {
  const customer = await tx.customer.upsert({
    where: { /* natural key */ },
    create: { orgId, name, address },
    update: { address },
  });

  const vehicle = await tx.vehicle.upsert({
    where: { orgId_registrationNo: { orgId, registrationNo } },
    create: { orgId, customerId: customer.id, registrationNo, make, model },
    update: { make, model },
  });

  await tx.device.update({
    where: { id: deviceId },
    data: { status: "installed" },
  });

  await tx.installation.create({
    data: {
      orgId,
      customerId: customer.id,
      vehicleId: vehicle.id,
      deviceId,
      accountId,
      installationDate,
      installationPay,
      simPayment,
      devicePayment,
      netPayment,
      nextRenewalDate: addMonths(installationDate, RENEWAL_MONTHS),
    },
  });
});
```

**Rules:**

- Any write spanning more than one table that must succeed together uses `prisma.$transaction`
- Inside a transaction use the `tx` client — never the global `prisma`
- Never write `installations.total_amount` — it is a generated SQL column
- Device status flips to `installed` in the same transaction as the installation — never separately
- Renewal dates use `addMonths(date, RENEWAL_MONTHS)` from date-fns — never hardcode 12

### Migrations

```bash
npx prisma migrate dev --name <change>   # create + apply in dev
npx prisma generate                       # regenerate client after schema edits
```

**Rules:**

- The `total_amount` generated column is added via a manual follow-up migration (see total_amount.sql) — never as a normal Prisma field
- Always `prisma generate` after editing the schema — stale client types cause silent drift
- Never edit applied migration files — create a new migration instead

---

## Auth.js (NextAuth)

**Check first:** Check AGENTS.md for an installed Auth.js skill. Auth.js v5 APIs differ significantly from older NextAuth — always verify against current docs.

### Config

```typescript
// lib/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      authorize: async (credentials) => {
        // verify against users table, return { id, orgId, role } or null
      },
    }),
  ],
  callbacks: {
    jwt: ({ token, user }) => {
      if (user) {
        token.orgId = user.orgId;
        token.role = user.role;
      }
      return token;
    },
    session: ({ session, token }) => {
      session.user.orgId = token.orgId as string;
      session.user.role = token.role as string;
      return session;
    },
  },
});
```

### Getting the session

```typescript
// Server Components, Server Actions, Route Handlers
import { auth } from "@/lib/auth";

const session = await auth();
if (!session) redirect("/login");
const orgId = session.user.orgId; // every query scopes to this
```

**Rules:**

- `orgId` and `role` are embedded in the JWT and read from the session — never accept an orgId from the client
- Every protected Server Action / route resolves `orgId` from `auth()` before any DB call
- Route handlers live in `app/api/auth/[...nextauth]/route.ts` re-exporting `handlers`
- Middleware in `middleware.ts` guards every `(app)` route — redirect to `/login` if no session
- Never store plaintext passwords — hash with bcrypt/argon in `authorize`

---

## SheetJS (xlsx)

**Check first:** Check AGENTS.md for an installed SheetJS skill.

### Parsing the uploaded workbook

```typescript
// In app/api/import/route.ts — server side only
import * as XLSX from "xlsx";

const arrayBuffer = await file.arrayBuffer();
const wb = XLSX.read(arrayBuffer, { type: "array", cellDates: true });

const dataEntry = XLSX.utils.sheet_to_json<Record<string, unknown>>(
  wb.Sheets["Data entry"],
  { defval: null },
);
const renwal = XLSX.utils.sheet_to_json<Record<string, unknown>>(
  wb.Sheets["Renwal "], // note the trailing space in the original sheet name
  { defval: null },
);
```

**Rules:**

- Server-side only — never import `xlsx` in a client component
- Always read with `cellDates: true` so `Installetion Date` parses as a Date, not an Excel serial
- The renewal sheet name has a **trailing space** (`"Renwal "`) — match it exactly, or look it up case/space-insensitively
- `sheet_to_json` with `{ defval: null }` so empty cells are null, not missing keys
- Mapping happens in `lib/excel-import.ts` (pure functions) — the route owns all DB writes
- Map every original header exactly per the table in architecture.md — never rename a column's meaning
- Import is idempotent: upsert by `registrationNo` (vehicles) and `imeiNo` (devices) — never duplicate
- Unmatched Renwal rows (no installation for that registration) go into the returned error summary — never silently dropped

### Header → field mapping reference

The original headers are misspelled in the workbook. Map literal headers to clean fields:

```typescript
const DATA_ENTRY_MAP = {
  "Client Name": "customerName",
  "Registration No": "registrationNo",
  "Installetion Date": "installationDate",
  "Instalition Pay": "installationPay",
  "Sim Paymint": "simPayment",
  "Device paymint": "devicePayment",
  "Net Paymint": "netPayment",
  "Accunt": "accountName",
  "IMEI Number": "imeiNo",
  "GSM Number": "gsmNo",
  "GSM Numbar": "gsmNoAlt",
  "FM Mudule": "fmModule",
  "Cut OFF": "cutOff",
  // ...full map in architecture.md
} as const;
```

---

## Recharts

**Check first:** Check AGENTS.md for an installed Recharts skill.

### Chart components are client-only

```typescript
"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Point = { month: string; revenue: number };

export function RevenueChart({ data }: { data: Point[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="month" stroke="var(--color-text-muted)" fontSize={12} />
        <YAxis stroke="var(--color-text-muted)" fontSize={12} />
        <Tooltip />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="var(--color-accent)"
          strokeWidth={3}
          fill="rgba(197,15,45,0.18)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

**Rules:**

- Chart components are always `"use client"` — but the **data is fetched in a Server Component parent** and passed as a prop. Never fetch inside the chart.
- Always wrap charts in `ResponsiveContainer` — never fixed pixel widths
- Stroke/fill colors reference the chart tokens in ui-tokens.md (accent for revenue, success for renewals, warning for expenses) — never hardcode hex outside the token values
- Grid lines use `var(--color-border)`, axis labels `var(--color-text-muted)` at 12px
- Keep series to what the chart actually shows — never render empty series

---

## date-fns

**Check first:** Check AGENTS.md for an installed date-fns skill.

### Renewal date math

```typescript
import { addMonths, differenceInCalendarDays, isBefore } from "date-fns";
import { RENEWAL_MONTHS, RENEWAL_REMINDER_DAYS } from "@/lib/utils";

const nextRenewal = addMonths(installationDate, RENEWAL_MONTHS);

const dueSoon =
  differenceInCalendarDays(nextRenewalDate, new Date()) <= RENEWAL_REMINDER_DAYS;

const overdue = isBefore(nextRenewalDate, new Date());
```

**Rules:**

- All renewal cycle math uses `addMonths(date, RENEWAL_MONTHS)` — never manual date arithmetic, never hardcode 12
- "Due soon" is `differenceInCalendarDays <= RENEWAL_REMINDER_DAYS` — never hardcode 30
- Always compare calendar days, not millisecond diffs, for due/overdue logic
- Store dates as `@db.Date` in Prisma — time-of-day is irrelevant for renewals

---

## shadcn/ui

**Check first:** Check AGENTS.md for an installed shadcn skill.

**Rules:**

- UI primitives (Button, Input, Table, Dialog, Badge, Select, etc.) come from `components/ui/` only — never reimplement them
- Before building any custom component, check whether shadcn already provides it
- Style shadcn components with project tokens from ui-tokens.md — never inline hex or raw Tailwind colors
- Customize variants via the component's own variant API — never fork the file to hardcode brand colors; map brand/accent through the token layer
- One component per file; `components/ui/` is the only folder allowed to barrel-export