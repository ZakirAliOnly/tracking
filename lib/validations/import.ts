import { z } from "zod";
import { normalizeMobile, parseDate, parseMoney } from "@/lib/csv-import";
import type { DiscountMode } from "@/lib/installation-money";

export const MAX_IMPORT_ROWS = 1000;

function requiredText(label: string) {
  return z
    .string()
    .default("")
    .transform((v, ctx) => {
      const trimmed = v.trim();
      if (trimmed === "") {
        ctx.addIssue({ code: "custom", message: `${label} is required` });
        return z.NEVER;
      }
      return trimmed;
    });
}

function money(label: string) {
  return z
    .string()
    .default("")
    .transform((v, ctx) => {
      const amount = parseMoney(v);
      if (amount === null) {
        ctx.addIssue({ code: "custom", message: `${label} must be a number of 0 or more` });
        return z.NEVER;
      }
      return amount;
    });
}

function requiredDate(label: string) {
  return z
    .string()
    .default("")
    .transform((v, ctx) => {
      const parsed = parseDate(v);
      if (parsed === null) {
        ctx.addIssue({
          code: "custom",
          message: `${label} must be a date like 2026-01-15 or 15/01/2026`,
        });
        return z.NEVER;
      }
      return parsed;
    });
}

const TRUTHY = new Set(["yes", "y", "true", "1", "received", "paid"]);
const FALSY = new Set(["no", "n", "false", "0", "pending", "unpaid", ""]);

const receivedField = z
  .string()
  .default("")
  .transform((v, ctx) => {
    const normalized = v.trim().toLowerCase();
    if (TRUTHY.has(normalized)) return true;
    if (FALSY.has(normalized)) return false;
    ctx.addIssue({ code: "custom", message: "received must be Yes or No" });
    return z.NEVER;
  });

const simNoField = z
  .string()
  .default("")
  .transform((v, ctx) => {
    const digits = normalizeMobile(v);
    if (digits === "") return null;
    if (digits.length !== 11) {
      ctx.addIssue({ code: "custom", message: "Sim Number must be exactly 11 digits" });
      return z.NEVER;
    }
    return digits;
  });

export const installationImportRowSchema = z.object({
  customerName: requiredText("Client Name"),
  registrationNo: requiredText("Registration No"),
  installationDate: requiredDate("Installetion Date"),
  received: receivedField,
  amount: money("Amount"),
  simPayment: money("Sim"),
  simNo: simNoField,
});

export const overwriteLinesSchema = z.array(z.number().int().positive()).max(MAX_IMPORT_ROWS);

export const importPayloadSchema = z.object({
  rows: z
    .array(z.record(z.string(), z.string()))
    .min(1, "The file has no data rows")
    .max(MAX_IMPORT_ROWS, `A single file can hold at most ${MAX_IMPORT_ROWS} rows`),
});

export type InstallationImportRow = z.infer<typeof installationImportRowSchema>;

const optionalTextInput = z
  .string()
  .optional()
  .transform((v) => {
    const trimmed = (v ?? "").trim();
    return trimmed === "" ? null : trimmed;
  });

const moneyInput = z
  .string()
  .optional()
  .transform((v) => {
    const cleaned = (v ?? "").replace(/[,\s]/g, "");
    return cleaned === "" ? 0 : Number(cleaned);
  })
  .refine((v) => Number.isFinite(v) && v >= 0, "Amounts must be 0 or more");

/** What the New installation form posts. */
export const installationFormSchema = z.object({
  customerName: z.string().trim().min(1, "Client Name is required"),
  registrationNo: z.string().trim().min(1, "Registration No is required"),
  installationDate: z.string().min(1, "Installetion Date is required"),
  // The fitted devices price the job, but the total stays editable — the same
  // freedom the CSV import's Amount column has always had
  deviceIds: z.array(z.string()).default([]),
  deviceQuantities: z.array(z.string()).default([]),
  amount: moneyInput,
  simPayment: moneyInput,
  discountMode: z
    .string()
    .optional()
    .transform((v) => (v === "percent" ? "percent" : "fixed") as DiscountMode),
  discountValue: moneyInput,
  amountPaid: moneyInput,
  simNo: optionalTextInput
    .refine((v) => v === null || /^\d{11}$/.test(v), "Sim Number must be exactly 11 digits"),
  // Shape only — whether one is required depends on the org's own accounts,
  // which the schema cannot see. `resolveInstallationAccount` decides that
  accountId: optionalTextInput,
});

export type InstallationFormInput = z.infer<typeof installationFormSchema>;

/**
 * The optional installation block on the Add customer form — the same fields
 * minus Client Name, which the customer being saved already supplies.
 */
export const customerInstallationSchema = installationFormSchema.omit({ customerName: true });

export type CustomerInstallationInput = z.infer<typeof customerInstallationSchema>;

/** Pairs the parallel deviceId / quantity fields a form posts into lines. */
export function toDeviceLines(
  deviceIds: string[],
  quantities: string[]
): { deviceId: string; quantity: number }[] {
  return deviceIds
    .map((deviceId, i) => ({
      deviceId: deviceId.trim(),
      quantity: Math.floor(Number(quantities[i] ?? "1")) || 1,
    }))
    .filter((line) => line.deviceId !== "");
}
