import { prisma } from "@/lib/prisma";
import {
  describeRowIssues,
  installationImportRowSchema,
  type InstallationImportRow,
} from "@/lib/validations/import";

export type FieldDiff = { label: string; existing: string; incoming: string };

export type RowPlanStatus = "create" | "update" | "duplicate" | "invalid";

export type RowPlan = {
  line: number;
  customerName: string;
  registrationNo: string;
  status: RowPlanStatus;
  message: string | null;
  diffs: FieldDiff[];
};

export type ImportPlan = {
  rows: RowPlan[];
  counts: Record<RowPlanStatus, number>;
};

export function normalizeRegistration(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

function money(value: unknown): string {
  return String(Number(value ?? 0));
}

function text(value: unknown): string {
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

// The header occupies line 1, so the first data row is line 2
function lineOf(index: number): number {
  return index + 2;
}

export async function buildImportPlan(
  orgId: string,
  rawRows: Record<string, string>[]
): Promise<ImportPlan> {
  const plans: RowPlan[] = [];
  const valid: { line: number; data: InstallationImportRow }[] = [];

  rawRows.forEach((raw, index) => {
    const parsed = installationImportRowSchema.safeParse(raw);
    if (!parsed.success) {
      plans.push({
        line: lineOf(index),
        customerName: raw.customerName ?? "",
        registrationNo: raw.registrationNo ?? "",
        status: "invalid",
        // Every broken cell, named, so the review says what to fix rather than
        // just that something is wrong
        message: describeRowIssues(raw, lineOf(index))
          .map((i) => (i.column ? `${i.column}: ${i.message}` : i.message))
          .join(" · "),
        diffs: [],
      });
      return;
    }
    valid.push({ line: lineOf(index), data: parsed.data });
  });

  // The same vehicle twice in one file — there is no safe way to guess which
  // line was meant, so every line involved is held back
  const linesByReg = new Map<string, number[]>();
  for (const row of valid) {
    const reg = normalizeRegistration(row.data.registrationNo);
    linesByReg.set(reg, [...(linesByReg.get(reg) ?? []), row.line]);
  }

  const duplicateMessages = new Map<number, string>();
  for (const [reg, lines] of linesByReg) {
    if (lines.length < 2) continue;
    for (const line of lines) {
      const others = lines.filter((l) => l !== line);
      duplicateMessages.set(
        line,
        `Registration No ${reg} also appears on line ${others.join(", ")} of this file`
      );
    }
  }

  for (const row of valid) {
    const message = duplicateMessages.get(row.line);
    if (!message) continue;
    plans.push({
      line: row.line,
      customerName: row.data.customerName,
      registrationNo: row.data.registrationNo,
      status: "duplicate",
      message,
      diffs: [],
    });
  }

  const survivors = valid.filter((row) => !duplicateMessages.has(row.line));
  const regs = [...new Set(survivors.map((r) => normalizeRegistration(r.data.registrationNo)))];

  const vehicles = regs.length
    ? await prisma.vehicle.findMany({
        where: { orgId, registrationNo: { in: regs, mode: "insensitive" } },
        include: {
          installations: {
            include: {
              customer: { select: { name: true, address: true, remarks: true } },
              vehicle: {
                select: {
                  description: true,
                  make: true,
                  model: true,
                  engineNo: true,
                  chassisNo: true,
                  colour: true,
                },
              },
            },
          },
        },
      })
    : [];

  const vehicleByReg = new Map(vehicles.map((v) => [normalizeRegistration(v.registrationNo), v]));

  for (const row of survivors) {
    const reg = normalizeRegistration(row.data.registrationNo);
    const existing = vehicleByReg.get(reg)?.installations[0];

    plans.push({
      line: row.line,
      customerName: row.data.customerName,
      registrationNo: row.data.registrationNo,
      status: existing ? "update" : "create",
      message: null,
      diffs: existing ? diffAgainstExisting(row.data, existing) : [],
    });
  }

  plans.sort((a, b) => a.line - b.line);

  const counts: Record<RowPlanStatus, number> = {
    create: 0,
    update: 0,
    duplicate: 0,
    invalid: 0,
  };
  for (const plan of plans) counts[plan.status] += 1;

  return { rows: plans, counts };
}

type ExistingInstallation = {
  installationDate: Date;
  received: boolean;
  installationPay: unknown;
  simPayment: unknown;
  devicePayment: unknown;
  amountPaid: unknown;
  otherAmount: unknown;
  simNo: string | null;
  customer: { name: string; address: string | null; remarks: string | null };
  vehicle: {
    description: string | null;
    make: string | null;
    model: string | null;
    engineNo: string | null;
    chassisNo: string | null;
    colour: string | null;
  };
};

function diffAgainstExisting(
  incoming: InstallationImportRow,
  existing: ExistingInstallation
): FieldDiff[] {
  const pairs: FieldDiff[] = [
    { label: "Client Name", existing: existing.customer.name, incoming: incoming.customerName },
    {
      label: "Installetion Date",
      existing: isoDate(existing.installationDate),
      incoming: incoming.installationDate,
    },
    { label: "Address", existing: text(existing.customer.address), incoming: text(incoming.address) },
    { label: "Remarks", existing: text(existing.customer.remarks), incoming: text(incoming.remarks) },

    { label: "Car Description", existing: text(existing.vehicle.description), incoming: text(incoming.carDescription) },
    { label: "Make", existing: text(existing.vehicle.make), incoming: text(incoming.make) },
    { label: "Model", existing: text(existing.vehicle.model), incoming: text(incoming.model) },
    { label: "Engine Number", existing: text(existing.vehicle.engineNo), incoming: text(incoming.engineNo) },
    { label: "Chassis Number", existing: text(existing.vehicle.chassisNo), incoming: text(incoming.chassisNo) },
    { label: "Colour", existing: text(existing.vehicle.colour), incoming: text(incoming.colour) },

    { label: "GSM Number", existing: text(existing.simNo), incoming: text(incoming.simNo) },
    { label: "Amount", existing: money(existing.installationPay), incoming: money(incoming.amount) },
    { label: "Sim", existing: money(existing.simPayment), incoming: money(incoming.simPayment) },
    { label: "Amount Device", existing: money(existing.devicePayment), incoming: money(incoming.devicePayment) },
    { label: "Total Paid", existing: money(existing.amountPaid), incoming: money(incoming.amountPaid) },
    { label: "Others", existing: money(existing.otherAmount), incoming: money(incoming.otherAmount) },
  ];

  return pairs.filter((p) => p.existing !== p.incoming);
}
