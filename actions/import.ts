"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildImportPlan, type ImportPlan } from "@/lib/import-plan";
import { writeInstallation } from "@/lib/installation-write";
import { importPayloadSchema, installationImportRowSchema } from "@/lib/validations/import";

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
        summary.errors.push({ line, message: firstIssue(parsed.error.issues) });
        continue;
      }

      const row = parsed.data;

      try {
        const customerId = customerByName.get(row.customerName.toLowerCase()) ?? null;

        const outcome = await prisma.$transaction((tx) =>
          writeInstallation(tx, orgId, {
            customerId,
            customerName: row.customerName,
            registrationNo: row.registrationNo,
            installationDate: row.installationDate,
            received: row.received,
            amount: row.amount,
            simPayment: row.simPayment,
            simNo: row.simNo,
          })
        );

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
