# Code Standards

Implementation rules and conventions for the entire project. The AI agent must follow these in every session without exception. These rules prevent pattern drift across sessions.

---

## Engineering Mindset

The AI agent on this project operates as a senior engineer. This means:

- **Think before implementing** — understand what is being built and why before writing a single line
- **Read context files first** — never assume, always verify against architecture.md and project-overview.md
- **Scope is sacred** — only build what the current feature requires. Never go beyond scope even if it seems helpful
- **Every feature must be testable** — if it cannot be verified immediately after implementation, it is incomplete
- **Clean over clever** — simple readable code that a junior developer can understand is always preferred over clever abstractions
- **One thing at a time** — complete one feature fully before touching the next
- **Failures are expected** — wrap risky operations in try/catch, log failures, never let one failure crash everything

---

## TypeScript

- Strict mode enabled in tsconfig.json — no exceptions
- Never use `any` — use `unknown` and narrow the type
- Never use type assertions (`as SomeType`) unless absolutely necessary and commented why
- All function parameters and return types must be explicitly typed
- Use `type` for object shapes and unions — use `interface` only for extendable component props
- Prefer Prisma's generated types (`Prisma.CustomerGetPayload<...>`) over hand-written DB shapes
- All async functions must have proper error handling — never let promises float unhandled
- Use `const` by default — only use `let` when reassignment is necessary

---

## Next.js 16 Conventions

- App Router only — no Pages Router
- React 19 — use React 19 APIs throughout
- All components are Server Components by default
- Only add `"use client"` when the component requires:
  - useState or useReducer
  - useEffect
  - Browser APIs
  - Event listeners
  - Third party client-only libraries
- Never add `"use client"` to layout files unless absolutely required
- Data fetching happens in Server Components — never fetch in Client Components directly
- Route handlers live in `app/api/` — never put business logic directly in route handlers
- Server Actions live in `actions/` — never define Server Actions inline in components
- Caching is uncached by default — all dynamic code runs at request time
- Always read Next.js documentation before implementing any Next.js specific feature — APIs may differ from training data

---

## File and Folder Naming

- Folders: kebab-case — `payment-methods`, `job-details`
- Component files: PascalCase — `StatsBar.tsx`, `InstallationTable.tsx`
- Utility files: camelCase — `excel-import.ts`, `reports.ts`
- Type files: camelCase — `index.ts`
- API route files: always `route.ts`
- Server Action files: camelCase — `customers.ts`, `installations.ts`
- One component per file — never export multiple components from one file
- Index files only in `components/ui/` — never barrel export from other folders

---

## Component Structure

Every component follows this exact order:

```typescript
"use client"; // only if needed

// 1. External imports
import { useState } from "react";
import { Button } from "@/components/ui/button";

// 2. Internal imports
import { StatsCard } from "@/components/dashboard/StatsCard";

// 3. Type definitions
type Props = {
  installationId: string;
  totalAmount: number;
};

// 4. Component
export function ComponentName({ installationId, totalAmount }: Props) {
  // state
  // derived values
  // handlers
  // return JSX
}
```

- Never use default exports for components — always named exports
- Props type defined directly above the component — not in a separate types file unless shared
- No inline styles — all styling via Tailwind classes using CSS variables from ui-tokens.md

---

## Prisma Usage

```typescript
// lib/prisma.ts — singleton, never instantiate PrismaClient elsewhere
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

- Always import the shared `prisma` from `@/lib/prisma` — never call `new PrismaClient()` anywhere else
- Every query is scoped by `orgId` — never query without an org filter
- Multi-step writes that must succeed together use `prisma.$transaction` (installation = customer + vehicle + device + installation)
- Never write `product.quantity`-style derived state directly — go through the dedicated mutation that records the change
- Schema lives in `prisma/schema.prisma` — it is the single source of truth for the data model
- `total_amount` is a generated SQL column — never set it from application code

---

## API Route Handlers

```typescript
// app/api/import/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    const body = await req.json();
    // validate body with Zod
    // do work, scoped to session.orgId
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[api/import]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- Every route handler has a try/catch
- Every route handler checks the session before processing (except auth + public routes)
- Every route handler validates the request body before processing
- Errors are logged with the route path as prefix: `[api/import]`
- Always return `{ success: boolean, data?: T, error?: string }`
- Never return raw data without the success wrapper

---

## Cron Route Handlers

```typescript
// app/api/renewals/remind/route.ts

import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }
    // do work
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("[api/renewals/remind]", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

- Every cron handler verifies the `CRON_SECRET` bearer header before doing anything
- Cron handlers are never reachable from the UI — they only run on schedule or with the secret

---

## Server Actions

```typescript
// actions/installations.ts

"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { installationSchema } from "@/lib/validations/installation";

export async function saveInstallation(input: unknown) {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };

    const data = installationSchema.parse(input);
    // write to DB, scoped to session.orgId
    revalidatePath("/installations");
    return { success: true };
  } catch (error) {
    console.error("[actions/installations]", error);
    return { success: false, error: "Failed to save installation" };
  }
}
```

- Every Server Action has a try/catch
- Every Server Action checks the session and resolves `orgId` from it — never trust an orgId from the client
- Every Server Action validates input with its Zod schema before writing
- Every Server Action returns `{ success: boolean, error?: string }`
- Always call `revalidatePath` after mutations that affect page data
- Never throw from Server Actions — always return the error

---

## Validation

```typescript
// lib/validations/installation.ts
import { z } from "zod";

export const installationSchema = z.object({
  customerName: z.string().min(1),
  registrationNo: z.string().min(1),
  installationDate: z.coerce.date(),
  installationPay: z.coerce.number().nonnegative(),
  simPayment: z.coerce.number().nonnegative(),
  devicePayment: z.coerce.number().nonnegative(),
  netPayment: z.coerce.number().nonnegative(),
});

export type InstallationInput = z.infer<typeof installationSchema>;
```

- One Zod schema per entity in `lib/validations/`
- Schemas are the single source of input validation — used by both Server Actions and API routes
- Money fields are `coerce.number().nonnegative()` — never accept negative payments
- Derive TypeScript input types from schemas with `z.infer` — never hand-write them

---

## Excel Import

```typescript
// lib/excel-import.ts — pure mapping, no DB calls
export function mapDataEntryRow(row: Record<string, unknown>): MappedInstallation { ... }
export function mapRenwalRow(row: Record<string, unknown>): MappedRenewal { ... }
```

- `lib/excel-import.ts` only maps columns to entity shapes — it never touches the database
- The import API route owns all DB writes, wrapped in a per-row transaction
- Import is idempotent: upsert by `registrationNo` (vehicles) and `imeiNo` (devices) — never duplicate
- Renwal rows are matched to installations by `registrationNo` — unmatched rows go to the error summary, never silently dropped
- Original Excel headers (Installetion, Paymint, Accunt…) are mapped per the table in architecture.md — never rename a column meaning

---

## Error Handling

- Never use empty catch blocks — always log or handle
- Console errors always include context prefix: `[component/function name]`
- User-facing errors must be human readable — never expose raw error messages
- API route errors return `status: 500` with a generic message — never expose internals
- Import errors are collected into the returned summary `{ inserted, skipped, errors[] }` — never crash the whole import on one bad row

---

## Money Handling

- All monetary values are stored as Prisma `Decimal` (`numeric(12,2)`) — never `float`
- Convert `Decimal` to number only at the display boundary, never for storage or arithmetic that persists
- `installations.total_amount` is computed by the database — application code reads it, never writes it
- Renewal amounts never modify the original installation's payment fields

---

## Environment Variables

All environment variables defined in `.env.local` for development. Never hardcode any key, URL, or secret anywhere in the codebase.

| Variable          | Used In                  |
| ----------------- | ------------------------ |
| `DATABASE_URL`    | prisma / lib/prisma.ts   |
| `AUTH_SECRET`     | lib/auth.ts (Auth.js)    |
| `AUTH_URL`        | lib/auth.ts              |
| `CRON_SECRET`     | app/api/renewals/remind  |

`NEXT_PUBLIC_` prefix means the variable is exposed to the browser. Never add `NEXT_PUBLIC_` to secret keys.

---

## Renewal Cycle

The renewal cycle length is defined once as a constant. Never hardcode this value anywhere else.

```typescript
// lib/utils.ts
export const RENEWAL_MONTHS = 12;
export const RENEWAL_REMINDER_DAYS = 30;
```

Import and use these constants everywhere they are needed.

---

## Import Aliases

Always use the `@/` alias — never use relative imports that go up more than one level.

```typescript
// Correct
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { RENEWAL_MONTHS } from "@/lib/utils";

// Never
import { Button } from "../../../components/ui/button";
```

---

## Comments

- No comments explaining what the code does — code must be self-explanatory
- Comments only for why — explaining a non-obvious decision
- Never leave TODO comments in committed code

---

## Dependencies

Never install a new package without a clear reason. Before installing anything check:

1. Does shadcn/ui already have this component?
2. Does Next.js already provide this functionality?
3. Is there a simpler native solution?

Approved dependencies for this project:

- `@prisma/client` + `prisma` — database access + migrations
- `next-auth` (Auth.js) — authentication
- `zod` — schema validation
- `xlsx` (SheetJS) — Excel import parsing
- `recharts` — dashboard + report charts
- `lucide-react` — icons
- `tailwindcss` — styling
- `shadcn/ui` components — UI primitives
- `date-fns` — date math for renewal cycles

Do not install any other packages without updating this list first.