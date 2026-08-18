import { parseCsv } from "@/lib/csv";

/**
 * The columns collected when adding an installation. Headers keep the
 * workbook's own spelling so a row can be pasted straight across; the
 * corrected spellings are accepted as aliases.
 */
export type ColumnSpec = {
  key: string;
  header: string;
  aliases?: string[];
  occurrence?: number;
  required: boolean;
  /** Shape the cell must take, printed in the template's own heading. */
  format?: string;
  hint: string;
  sample: string;
};

export const INSTALLATION_COLUMNS: ColumnSpec[] = [
  { key: "customerName", header: "Client Name", aliases: ["Customer Name"], required: true, hint: "Matched on this name — a new customer is created if it is not found", sample: "Mumtaz Ahmad" },
  { key: "registrationNo", header: "Registration No", aliases: ["Reg No", "Registration Number"], required: true, hint: "Vehicle number plate — one installation per vehicle", sample: "BHN-058" },
  { key: "installationDate", header: "Installetion Date", aliases: ["Installation Date"], required: true, format: "YYYY-MM-DD", hint: "Write it as 2026-01-15. 15/01/2026 and 01/15/2026 are both read — whichever reading is a real date wins", sample: "2026-01-15" },

  // The sheet repeats "Mobile Number" after each named contact, so each pair is
  // resolved by how many times the heading has been seen
  { key: "contact1", header: "Contact 1", required: false, hint: "Main contact person — their mobile also becomes the customer's phone number", sample: "Mumtaz Ahmad" },
  { key: "mobile1", header: "Mobile Number", occurrence: 1, required: false, hint: "Mobile for Contact 1 — any digits are kept as written, no fixed length", sample: "03011234567" },
  { key: "contact2", header: "Contact 2", required: false, hint: "Second contact person — leave blank if there is only one", sample: "Bilal Ahmad" },
  { key: "mobile2", header: "Mobile Number", occurrence: 2, required: false, hint: "Mobile for Contact 2", sample: "03021234567" },
  { key: "contact3", header: "Contact 3", required: false, hint: "Third contact person", sample: "" },
  { key: "mobile3", header: "Mobile Number", occurrence: 3, required: false, hint: "Mobile for Contact 3", sample: "" },
  { key: "contact4", header: "Contact 4", required: false, hint: "Fourth contact person", sample: "" },
  { key: "mobile4", header: "Mobile Number", occurrence: 4, required: false, hint: "Mobile for Contact 4", sample: "" },

  { key: "remarks", header: "Remarks", required: false, hint: "Free notes kept on the customer", sample: "Repeat client" },
  { key: "address", header: "Address", required: false, hint: "Customer's address", sample: "12 Mall Road, Lahore" },
  { key: "password", header: "Password", required: false, hint: "Tracking portal password held for the customer", sample: "abc123" },

  { key: "carDescription", header: "Car Description", aliases: ["Description"], required: false, hint: "How the vehicle is described on the sheet", sample: "White Corolla GLi" },
  { key: "make", header: "Make", required: false, hint: "Vehicle manufacturer", sample: "Toyota" },
  { key: "model", header: "Model", required: false, hint: "Vehicle model", sample: "Corolla GLi 2019" },
  { key: "engineNo", header: "Engine Number", aliases: ["Engine No"], required: false, hint: "Engine number", sample: "2NZ1234567" },
  { key: "chassisNo", header: "Chassis Number", aliases: ["Chassis No"], required: false, hint: "Chassis number", sample: "NZE1419876543" },
  { key: "cutOff", header: "Cut OFF", aliases: ["Cutoff", "Cut Off"], required: false, hint: "Cut-off fitted with the device", sample: "Relay" },
  { key: "colour", header: "Colour", aliases: ["Color"], required: false, hint: "Vehicle colour", sample: "White" },

  { key: "simNo", header: "GSM Number", aliases: ["Sim Number", "Sim No"], required: false, hint: "SIM number fitted in the device — any digits are kept as written, no fixed length", sample: "03011234567" },
  { key: "gsmNoAlt", header: "GSM Numbar", required: false, hint: "Second SIM number, if the device carries one", sample: "" },
  { key: "imeiNo", header: "IMEI Number", aliases: ["IMEI", "IMEI No"], required: false, hint: "Identifies the device — a matching stock item is used, or a new one is created and taken out of stock", sample: "860123456789012" },
  { key: "fmModule", header: "FM Mudule", aliases: ["FM Module"], required: false, hint: "Device model fitted", sample: "GT06N" },

  { key: "amount", header: "Amount", aliases: ["amount"], required: false, format: "number", hint: "Installation charge", sample: "8000" },
  { key: "simPayment", header: "Sim", aliases: ["Sim and Osting", "Sim Payment", "Sim Paymint"], required: false, format: "number", hint: "SIM charge", sample: "6000" },
  { key: "devicePayment", header: "Amount Device", aliases: ["Device Amount", "Device"], required: false, format: "number", hint: "Device charge", sample: "4000" },
  { key: "amountPaid", header: "Total Paid", aliases: ["Total Pay", "Paid"], required: false, format: "number", hint: "What the customer has actually paid — the row counts as received once this covers Amount + Sim + Amount Device", sample: "18000" },
  { key: "otherAmount", header: "Others", aliases: ["Other"], required: false, format: "number", hint: "What is left after SIM, device and expenses are taken off — written by hand, never worked out for you", sample: "2000" },
];

export const TEMPLATE_FILENAME = "installations-import-template.csv";

/** `Installetion Date` → `Installetion Date (YYYY-MM-DD)`. */
export function templateHeader(column: ColumnSpec): string {
  return column.format ? `${column.header} (${column.format})` : column.header;
}

export function buildTemplateRows(): string[][] {
  return [
    INSTALLATION_COLUMNS.map(templateHeader),
    INSTALLATION_COLUMNS.map((c) => c.sample),
  ];
}

export type ParsedFile = {
  rows: Record<string, string>[];
  missingHeaders: string[];
  unknownHeaders: string[];
};

function normalizeHeader(header: string): string {
  // A trailing note in brackets is guidance, not part of the name, so the
  // template's own "Installetion Date (YYYY-MM-DD)" matches a plain
  // "Installetion Date" typed by hand
  return header
    .replace(/\s*\([^()]*\)\s*$/, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, " ");
}

function lookupKey(header: string, occurrence: number): string {
  return `${normalizeHeader(header)}#${occurrence}`;
}

function buildHeaderLookup(): Map<string, ColumnSpec> {
  const lookup = new Map<string, ColumnSpec>();

  for (const column of INSTALLATION_COLUMNS) {
    lookup.set(lookupKey(column.header, column.occurrence ?? 1), column);
    for (const alias of column.aliases ?? []) {
      lookup.set(lookupKey(alias, 1), column);
    }
  }

  return lookup;
}

export function parseImportFile(text: string): ParsedFile {
  const grid = parseCsv(text);

  if (grid.length === 0) {
    return {
      rows: [],
      missingHeaders: INSTALLATION_COLUMNS.filter((c) => c.required).map((c) => c.header),
      unknownHeaders: [],
    };
  }

  const lookup = buildHeaderLookup();
  const indexByKey = new Map<string, number>();
  const unknownHeaders: string[] = [];

  // A header is resolved by name and by how many times it has already been
  // seen, so repeated headers can map to distinct columns
  const seenCounts = new Map<string, number>();

  grid[0].forEach((rawHeader, index) => {
    const normalized = normalizeHeader(rawHeader);
    if (normalized === "") return;

    const occurrence = (seenCounts.get(normalized) ?? 0) + 1;
    seenCounts.set(normalized, occurrence);

    const column = lookup.get(`${normalized}#${occurrence}`);
    if (!column) {
      unknownHeaders.push(rawHeader.trim());
      return;
    }
    if (!indexByKey.has(column.key)) indexByKey.set(column.key, index);
  });

  const missingHeaders = INSTALLATION_COLUMNS.filter(
    (c) => c.required && !indexByKey.has(c.key)
  ).map((c) => c.header);

  const rows = grid.slice(1).map((cells) => {
    const row: Record<string, string> = {};
    for (const column of INSTALLATION_COLUMNS) {
      const index = indexByKey.get(column.key);
      row[column.key] = index === undefined ? "" : (cells[index] ?? "").trim();
    }
    return row;
  });

  return { rows, missingHeaders, unknownHeaders };
}

export function parseMoney(value: string): number | null {
  const cleaned = value.replace(/[,\s]/g, "").replace(/^(rs\.?|pkr)/i, "");
  if (cleaned === "") return 0;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

export function normalizeMobile(value: string): string {
  return value.replace(/\D/g, "");
}

function buildDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

const EXCEL_EPOCH_UTC = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 86_400_000;

export function parseDate(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (iso) return buildDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  // Day-first is the assumed reading — but Excel re-writes whatever a sheet had
  // into its own locale's order the moment it re-saves the file, regardless of
  // what was typed, so "1/15/2026" (month-first) reaches here just as often as
  // day-first sheets do. Only one order can ever be a real date when one part
  // is over 12, so that reading is used automatically rather than rejected
  const slash = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(trimmed);
  if (slash) {
    const [, a, b, year] = slash;
    const dayFirst = buildDate(Number(year), Number(b), Number(a));
    if (dayFirst) return dayFirst;
    return buildDate(Number(year), Number(a), Number(b));
  }

  // Excel keeps dates as a serial day count when the sheet is exported unformatted
  const serial = /^\d{5}$/.exec(trimmed);
  if (serial) {
    return new Date(EXCEL_EPOCH_UTC + Number(trimmed) * MS_PER_DAY).toISOString().slice(0, 10);
  }

  return null;
}

export function toDateOnly(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00.000Z`);
}

export function addMonths(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + months, day));
  return shifted.toISOString().slice(0, 10);
}
