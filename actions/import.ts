"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildImportPlan, type ImportPlan } from "@/lib/import-plan";
import { resolveStockLineByType, type DeviceLine } from "@/lib/devices";
import { resolveOrCreateCashAccountId } from "@/lib/accounts";
import { writeInstallation } from "@/lib/installation-write";
import {
  describeRowIssues,
  importPayloadSchema,
  installationImportRowSchema,
  toImportContacts,
} from "@/lib/validations/import";

export type ImportRowError = { line: number; message: string };

export type ImportSummary = {
  created: number;
  updated: number;
  failed: number;
  skipped: number;
  customersCreated: number;
  errors: ImportRowError[];
};

export type ImportResult = {
  success: boolean;
  error?: string;
  summary?: ImportSummary;
};

export type CheckResult = {
  success: boolean;
  error?: string;
  plan?: ImportPlan;
};

function firstIssue(issues: { message: string }[]): string {
  return issues[0]?.message ?? "Row could not be read";
}

function lineOf(index: number): number {
  return index + 2;
}

/** Read-only preflight — reports duplicates and pending changes without writing. */
export async function checkInstallationImport(rows: unknown): Promise<CheckResult> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };

    const payload = importPayloadSchema.safeParse({ rows });
    if (!payload.success) {
      return { success: false, error: firstIssue(payload.error.issues) };
    }

    const plan = await buildImportPlan(session.user.orgId, payload.data.rows);
    return { success: true, plan };
  } catch (error) {
    console.error("[actions/import] checkInstallationImport", error);
    return { success: false, error: "Could not check the file. Please try again." };
  }
}

export async function importInstallations(rows: unknown): Promise<ImportResult> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };
    const { orgId } = session.user;

    const payload = importPayloadSchema.safeParse({ rows });
    if (!payload.success) {
      return { success: false, error: firstIssue(payload.error.issues) };
    }

    // Re-checked here rather than trusting whatever the browser decided
    const plan = await buildImportPlan(orgId, payload.data.rows);
    const planByLine = new Map(plan.rows.map((p) => [p.line, p]));

    const summary: ImportSummary = {
      created: 0,
      updated: 0,
      failed: 0,
      skipped: 0,
      customersCreated: 0,
      errors: [],
    };

    const accountId = await resolveOrCreateCashAccountId(orgId);

    const customers = await prisma.customer.findMany({
      where: { orgId },
      select: { id: true, name: true },
    });
    // Client Name is the only thing that identifies a customer
    const customerByName = new Map(customers.map((c) => [c.name.toLowerCase(), c.id]));

    for (const [index, raw] of payload.data.rows.entries()) {
      const line = lineOf(index);
      const rowPlan = planByLine.get(line);

      if (!rowPlan || rowPlan.status === "invalid") {
        summary.failed += 1;
        summary.errors.push({ line, message: rowPlan?.message ?? "Row could not be read" });
        continue;
      }

      if (rowPlan.status === "duplicate") {
        summary.skipped += 1;
        summary.errors.push({ line, message: rowPlan.message ?? "Duplicated in this file" });
        continue;
      }

      const parsed = installationImportRowSchema.safeParse(raw);
      if (!parsed.success) {
        summary.failed += 1;
        summary.errors.push({
          line,
          message: describeRowIssues(raw, line)
            .map((i) => (i.column ? `${i.column}: ${i.message}` : i.message))
            .join(" · "),
        });
        continue;
      }

      const row = parsed.data;

      try {
        const customerId = customerByName.get(row.customerName.toLowerCase()) ?? null;

        // Nothing is left to collect once what was paid covers all three charges
        const received =
          row.amountPaid >= row.amount + row.simPayment + row.devicePayment;

        const outcome = await prisma.$transaction(async (tx) => {
          // Quantities against the shared bulk pools — always supplied, so a
          // corrected Device Qty/Sim Qty on a re-import returns the right
          // number of units rather than only ever taking more out
          const devices: DeviceLine[] = [];
          if (row.deviceQty > 0) {
            const deviceId = await resolveStockLineByType(tx, orgId, "device");
            devices.push({ deviceId, quantity: row.deviceQty, unitPrice: 0 });
          }
          if (row.simQty > 0) {
            const simId = await resolveStockLineByType(tx, orgId, "sim");
            devices.push({ deviceId: simId, quantity: row.simQty, unitPrice: 0 });
          }

          return writeInstallation(tx, orgId, {
            customerId,
            customerName: row.customerName,
            registrationNo: row.registrationNo,
            installationDate: row.installationDate,
            received,
            amount: row.amount,
            simPayment: row.simPayment,
            simNo: row.simNo,
            accountId,
            devicePayment: row.devicePayment,
            otherAmount: row.otherAmount,
            amountPaid: row.amountPaid,
            customerDetail: {
              phone: row.mobile1,
              address: row.address,
              remarks: row.remarks,
              password: row.password,
            },
            contacts: toImportContacts(row),
            vehicleDetail: {
              description: row.carDescription,
              make: row.make,
              model: row.model,
              engineNo: row.engineNo,
              chassisNo: row.chassisNo,
              colour: row.colour,
            },
            devices,
            // Plain reference text, same fields the New installation form's
            // device-reference section writes — no longer tied to a Stock row
            imeiNo: row.imeiNo ?? undefined,
            gsmNo: row.gsmNoAlt ?? undefined,
            fmModule: row.fmModule ?? undefined,
            cutOff: row.cutOff ?? undefined,
          });
        });

        if (!customerId) {
          const created = await prisma.customer.findFirst({
            where: { orgId, name: row.customerName },
            select: { id: true },
            orderBy: { createdAt: "desc" },
          });
          // Cached so later rows for the same new customer reuse it
          if (created) customerByName.set(row.customerName.toLowerCase(), created.id);
          summary.customersCreated += 1;
        }

        if (outcome === "created") summary.created += 1;
        else summary.updated += 1;
      } catch (error) {
        console.error("[actions/import] row", line, error);
        summary.failed += 1;
        summary.errors.push({ line, message: "Could not be saved — check this row's values" });
      }
    }

    revalidatePath("/installations");
    revalidatePath("/customers");
    revalidatePath("/renewals");
    return { success: true, summary };
  } catch (error) {
    console.error("[actions/import] importInstallations", error);
    return { success: false, error: "Import failed. Please try again." };
  }
}
