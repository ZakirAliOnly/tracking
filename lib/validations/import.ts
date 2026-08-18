import { z } from "zod";
import { INSTALLATION_COLUMNS, normalizeMobile, parseDate, parseMoney } from "@/lib/csv-import";
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

/**
 * Digits only, whatever length the sheet has them at — a historical sheet mixes
 * landlines, numbers missing a leading 0, and full mobiles, and none of that is
 * worth rejecting a row over.
 */
const numberField = z
  .string()
  .default("")
  .transform((v) => {
    const digits = normalizeMobile(v);
    return digits === "" ? null : digits;
  });

const optionalText = z
  .string()
  .default("")
  .transform((v) => {
    const trimmed = v.trim();
    return trimmed === "" ? null : trimmed;
  });

/**
 * Excel rewrites a 15-digit IMEI as `8.60123E+14` the moment the cell is typed
 * as a number, which throws away the last digits for good. Importing that would
 * quietly create a stock device under a wrong identity, so it is refused with
 * the fix rather than accepted.
 */
const imeiField = z
  .string()
  .default("")
  .transform((v, ctx) => {
    const trimmed = v.trim();
    if (trimmed === "") return null;

    if (/^\d+(\.\d+)?e\+?\d+$/i.test(trimmed)) {
      ctx.addIssue({
        code: "custom",
        message:
          "IMEI Number has been shortened by Excel (8.60123E+14). Format that column as Text and paste the digits again",
      });
      return z.NEVER;
    }

    return trimmed;
  });

export const installationImportRowSchema = z.object({
  customerName: requiredText("Client Name"),
  registrationNo: requiredText("Registration No"),
  installationDate: requiredDate("Installetion Date"),

  contact1: optionalText,
  mobile1: numberField,
  contact2: optionalText,
  mobile2: numberField,
  contact3: optionalText,
  mobile3: numberField,
  contact4: optionalText,
  mobile4: numberField,

  remarks: optionalText,
  address: optionalText,
  password: optionalText,

  carDescription: optionalText,
  make: optionalText,
  model: optionalText,
  engineNo: optionalText,
  chassisNo: optionalText,
  cutOff: optionalText,
  colour: optionalText,

  simNo: numberField,
  gsmNoAlt: numberField,
  imeiNo: imeiField,
  fmModule: optionalText,

  amount: money("Amount"),
  simPayment: money("Sim"),
  devicePayment: money("Amount Device"),
  amountPaid: money("Total Paid"),
  otherAmount: money("Others"),
});

/** The named contacts on a row, in sheet order, with blanks dropped. */
export function toImportContacts(
  row: InstallationImportRow
): { name: string; mobile: string; position: number }[] {
  return [
    { name: row.contact1, mobile: row.mobile1 },
    { name: row.contact2, mobile: row.mobile2 },
    { name: row.contact3, mobile: row.mobile3 },
    { name: row.contact4, mobile: row.mobile4 },
  ]
    .map((c, i) => ({ ...c, position: i + 1 }))
    // A contact needs a name to be worth keeping; a lone mobile has nobody to belong to
    .filter((c): c is { name: string; mobile: string | null; position: number } => c.name !== null)
    .map((c) => ({ name: c.name, mobile: c.mobile ?? "", position: c.position }));
}

/** One thing wrong with one cell, named so it can be found in the spreadsheet. */
export type RowIssue = {
  line: number;
  /** The column's heading as it appears in the sheet, or null for whole-row problems. */
  column: string | null;
  message: string;
  /** What the cell actually held, so a mangled value is visible without reopening the file. */
  value: string;
};

const HEADER_BY_KEY = new Map(INSTALLATION_COLUMNS.map((c) => [c.key, c.header]));

/**
 * Every problem on a row, not just the first — a row with a bad date and a bad
 * IMEI would otherwise be fixed, re-uploaded, and rejected all over again.
 */
export function describeRowIssues(raw: Record<string, string>, line: number): RowIssue[] {
  const parsed = installationImportRowSchema.safeParse(raw);
  if (parsed.success) return [];

  const seen = new Set<string>();
  const issues: RowIssue[] = [];

  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? "");
    // Zod can report the same cell twice; the reader only needs it once
    const dedupe = `${key}|${issue.message}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);

    const column = HEADER_BY_KEY.get(key) ?? null;

    issues.push({
      line,
      column,
      // The column is shown as its own label, so a message that opens with the
      // same words would read "Amount: Amount must be a number"
      message:
        column && issue.message.startsWith(column)
          ? issue.message.slice(column.length).trimStart()
          : issue.message,
      value: raw[key] ?? "",
    });
  }

  return issues;
}

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

const strictMobile = optionalTextInput.refine(
  (v) => v === null || /^\d{11}$/.test(v),
  "must be exactly 11 digits"
);

/**
 * The standalone New installation form's own fields, on top of the shared
 * base — customer contact detail, vehicle detail, and plain reference text
 * for the fitted device. Kept separate from `installationFormSchema` so the
 * Add customer page's inline installation blocks (which collect the
 * customer's phone/address once, up front) are not affected.
 */
export const newInstallationFormSchema = installationFormSchema.extend({
  phone: strictMobile,
  address: optionalTextInput,

  contact1Name: optionalTextInput,
  contact1Mobile: strictMobile,
  contact2Name: optionalTextInput,
  contact2Mobile: strictMobile,
  contact3Name: optionalTextInput,
  contact3Mobile: strictMobile,
  contact4Name: optionalTextInput,
  contact4Mobile: strictMobile,

  carDescription: optionalTextInput,
  make: optionalTextInput,
  model: optionalTextInput,
  engineNo: optionalTextInput,
  chassisNo: optionalTextInput,
  colour: optionalTextInput,

  devicePayment: moneyInput,
  gsmNo: strictMobile,
  fmModule: optionalTextInput,
  cutOff: optionalTextInput,
  imeiNo: optionalTextInput,
});

export type NewInstallationFormInput = z.infer<typeof newInstallationFormSchema>;

/** The named contacts on the form, in slot order, with untouched slots dropped. */
export function toFormContacts(
  input: NewInstallationFormInput
): { name: string; mobile: string; position: number }[] {
  return [
    { name: input.contact1Name, mobile: input.contact1Mobile },
    { name: input.contact2Name, mobile: input.contact2Mobile },
    { name: input.contact3Name, mobile: input.contact3Mobile },
    { name: input.contact4Name, mobile: input.contact4Mobile },
  ]
    .map((c, i) => ({ ...c, position: i + 1 }))
    .filter((c): c is { name: string; mobile: string | null; position: number } => c.name !== null)
    .map((c) => ({ name: c.name, mobile: c.mobile ?? "", position: c.position }));
}

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
