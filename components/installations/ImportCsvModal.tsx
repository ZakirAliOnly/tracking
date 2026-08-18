"use client";

import { useRef, useState, useTransition } from "react";
import { AlertCircle, ChevronDown, Download, FileSpreadsheet, Upload, X } from "lucide-react";
import {
  checkInstallationImport,
  importInstallations,
  type ImportResult,
} from "@/actions/import";
import { ImportColumnGuide } from "@/components/installations/ImportColumnGuide";
import { ImportResultPanel } from "@/components/installations/ImportResultPanel";
import { ImportReview } from "@/components/installations/ImportReview";
import { useToast } from "@/components/ui/ToastProvider";
import type { ImportPlan } from "@/lib/import-plan";
import { downloadCsv } from "@/lib/csv";
import {
  INSTALLATION_COLUMNS,
  TEMPLATE_FILENAME,
  buildTemplateRows,
  parseImportFile,
  type ParsedFile,
} from "@/lib/csv-import";
import { MAX_IMPORT_ROWS, describeRowIssues, type RowIssue } from "@/lib/validations/import";

function validateRows(rows: Record<string, string>[]): RowIssue[] {
  return rows.flatMap((row, index) => describeRowIssues(row, index + 2));
}

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ImportCsvModal({ open, onClose }: Props) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [rowIssues, setRowIssues] = useState<RowIssue[]>([]);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const toast = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);

  function clearFile() {
    setFileName(null);
    setParsed(null);
    setRowIssues([]);
    setPlan(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleClose() {
    clearFile();
    setResult(null);
    setGuideOpen(false);
    onClose();
  }

  async function handleFile(file: File) {
    setResult(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      const parsedFile = parseImportFile(text);
      setParsed(parsedFile);
      setRowIssues(validateRows(parsedFile.rows));
      setPlan(null);
    } catch (error) {
      console.error("[ImportCsvModal/handleFile]", error);
      setParsed(null);
      setRowIssues([]);
      toast("That file could not be read. Save it as CSV and try again.");
    }
  }

  function handleCheck() {
    if (!parsed) return;
    const rows = parsed.rows;

    startTransition(async () => {
      const checkResult = await checkInstallationImport(rows);
      if (checkResult.success && checkResult.plan) {
        setPlan(checkResult.plan);
      } else {
        setPlan(null);
        toast(checkResult.error ?? "Could not check the file.");
      }
    });
  }

  function handleImport() {
    if (!parsed) return;
    const rows = parsed.rows;

    startTransition(async () => {
      const importResult = await importInstallations(rows);
      setResult(importResult);
      if (importResult.success) clearFile();
      else toast(importResult.error ?? "Import failed. Please try again.");
    });
  }

  if (!open) return null;

  // A row can break in several places at once, so problems are counted by line
  const badRowCount = new Set(rowIssues.map((i) => i.line)).size;
  const tooManyRows = (parsed?.rows.length ?? 0) > MAX_IMPORT_ROWS;
  const hasMissingHeaders = (parsed?.missingHeaders.length ?? 0) > 0;
  const noRows = parsed !== null && parsed.rows.length === 0;
  const fileUsable = parsed !== null && !hasMissingHeaders && !noRows && !tooManyRows;
  const canCheck = fileUsable && !isPending;

  const willImport = plan ? plan.counts.create + plan.counts.update : 0;
  const canImport = plan !== null && willImport > 0 && !isPending;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-overlay/40 backdrop-blur-sm" onClick={handleClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="flex w-full max-w-[720px] max-h-[92vh] flex-col rounded-[20px] bg-surface"
          style={{ boxShadow: "0 20px 60px -12px rgba(26,20,20,0.25)" }}
        >
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-5">
            <div>
              <h2 className="font-display text-[17px] font-semibold text-text-primary">
                Import installations
              </h2>
              <p className="mt-0.5 text-[13px] text-text-secondary">
                Bring the Data entry sheet in from a spreadsheet
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-[9px] text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
            {/* Step 1 — template */}
            <div className="flex items-start justify-between gap-4 rounded-[14px] border border-border bg-background p-4">
              <div>
                <p className="text-[13px] font-semibold text-text-primary">
                  1. Start from the template
                </p>
                <p className="mt-1 text-[12.5px] text-text-secondary">
                  The same columns the New installation form asks for. Each heading carries the
                  format it expects — dates as{" "}
                  <span className="font-mono text-text-primary">YYYY-MM-DD</span>, e.g.{" "}
                  <span className="font-mono text-text-primary">2026-01-15</span>. Delete the
                  example row, add your rows, save as CSV.
                </p>
              </div>
              <button
                type="button"
                onClick={() => downloadCsv(TEMPLATE_FILENAME, buildTemplateRows())}
                className="flex h-9 flex-none items-center gap-2 rounded-[9px] bg-accent px-4 text-[13px] font-semibold text-accent-foreground transition-opacity hover:opacity-90"
                style={{
                  boxShadow: "0 1px 2px rgba(225,29,72,0.20), 0 4px 12px -4px rgba(225,29,72,0.40)",
                }}
              >
                <Download className="h-4 w-4" />
                Download template
              </button>
            </div>

            {/* Step 2 — upload */}
            <div>
              <p className="mb-2 text-[13px] font-semibold text-text-primary">
                2. Upload your filled-in file
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />

              {!fileName ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center gap-2 rounded-[14px] border border-dashed border-border-muted bg-background px-6 py-8 transition-colors hover:border-accent hover:bg-accent-muted"
                >
                  <Upload className="h-6 w-6 text-text-muted" />
                  <span className="text-[14px] font-semibold text-text-primary">
                    Choose a CSV file
                  </span>
                  <span className="text-[12.5px] text-text-muted">
                    Up to {MAX_IMPORT_ROWS.toLocaleString("en-PK")} rows per file
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-3 rounded-[12px] border border-border bg-surface-muted px-4 py-3">
                  <FileSpreadsheet className="h-[18px] w-[18px] flex-none text-accent-dark" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-text-primary">
                      {fileName}
                    </p>
                    {parsed && (
                      <p className="text-[12.5px] text-text-secondary">
                        {parsed.rows.length} row{parsed.rows.length === 1 ? "" : "s"} found
                        {badRowCount > 0 && ` · ${badRowCount} with problems`}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={clearFile}
                    className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary"
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            {hasMissingHeaders && (
              <Notice tone="error">
                These required columns are missing from the file:{" "}
                <span className="font-semibold">{parsed?.missingHeaders.join(", ")}</span>. Download
                the template and copy your data into it.
              </Notice>
            )}

            {noRows && <Notice tone="error">The file has a header row but no data rows.</Notice>}

            {tooManyRows && (
              <Notice tone="error">
                The file has {parsed?.rows.length} rows — split it into files of{" "}
                {MAX_IMPORT_ROWS.toLocaleString("en-PK")} rows or fewer.
              </Notice>
            )}

            {!hasMissingHeaders && (parsed?.unknownHeaders.length ?? 0) > 0 && (
              <Notice tone="warning">
                These columns are not part of the template and will be ignored:{" "}
                <span className="font-semibold">{parsed?.unknownHeaders.join(", ")}</span>
              </Notice>
            )}
            {plan && !result?.summary && (
              <ImportReview plan={plan} />
            )}

            {!plan && !hasMissingHeaders && rowIssues.length > 0 && (
              <RowIssueList issues={rowIssues} />
            )}

            {!plan && parsed && !hasMissingHeaders && !noRows && (
              <PreviewTable rows={parsed.rows} />
            )}

            {result?.error && <Notice tone="error">{result.error}</Notice>}

            {result?.summary && <ImportResultPanel summary={result.summary} />}

            {/* Column reference */}
            <div className="rounded-[12px] border border-border">
              <button
                type="button"
                onClick={() => setGuideOpen((v) => !v)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-[13px] font-semibold text-text-primary">
                  What goes in each column
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-text-muted transition-transform ${
                    guideOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              {guideOpen && (
                <div className="border-t border-border px-4 py-4">
                  <p className="mb-3 text-[12.5px] text-text-secondary">
                    Column order does not matter and extra columns are ignored — only the headings
                    need to match, and the format in brackets after a heading is ignored too.
                    Amounts may include commas. Phone and GSM numbers are kept exactly as written,
                    any length.
                  </p>
                  <p className="mb-3 text-[12.5px] text-text-secondary">
                    <span className="font-semibold text-text-primary">Dates:</span> write{" "}
                    <span className="font-mono text-text-primary">2026-01-15</span> (year, month,
                    day). <span className="font-mono text-text-primary">15/01/2026</span> and{" "}
                    <span className="font-mono text-text-primary">01/15/2026</span> both work —
                    Excel silently rewrites typed dates into its own order when the file is saved,
                    so whichever reading is a real date is used.
                  </p>
                  <ImportColumnGuide columns={INSTALLATION_COLUMNS} />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-shrink-0 gap-3 border-t border-border px-6 py-5">
            <button
              type="button"
              onClick={handleClose}
              className="h-10 flex-1 rounded-[9px] border border-border bg-surface text-[14px] font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              {result?.summary ? "Done" : "Cancel"}
            </button>
            {!result?.summary && (
              <button
                type="button"
                onClick={plan ? handleImport : handleCheck}
                disabled={plan ? !canImport : !canCheck}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[9px] bg-accent text-[14px] font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                  boxShadow:
                    "0 1px 2px rgba(225,29,72,0.20), 0 4px 12px -4px rgba(225,29,72,0.40)",
                }}
              >
                {isPending && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {isPending
                  ? plan
                    ? "Importing…"
                    : "Checking…"
                  : plan
                    ? willImport > 0
                      ? `Import ${willImport} row${willImport === 1 ? "" : "s"}`
                      : "Nothing to import"
                    : "Check for duplicates"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── Notice ───────────────────────────────────────────── */

function Notice({ tone, children }: { tone: "error" | "warning"; children: React.ReactNode }) {
  const isError = tone === "error";
  return (
    <div
      className={`flex items-start gap-2.5 rounded-[12px] px-4 py-3 ${
        isError ? "bg-error-light" : "bg-warning-light"
      }`}
    >
      <AlertCircle
        className={`mt-0.5 h-4 w-4 flex-none ${
          isError ? "text-error-foreground" : "text-warning-foreground"
        }`}
      />
      <p className={`text-[13px] ${isError ? "text-error-foreground" : "text-warning-foreground"}`}>
        {children}
      </p>
    </div>
  );
}

/* ─── Row problems ─────────────────────────────────────── */

const ISSUE_ROW_LIMIT = 30;

/**
 * Every problem the file has, grouped by the line it is on and naming the
 * column, so the sheet can be corrected without guessing which cell was meant.
 */
function RowIssueList({ issues }: { issues: RowIssue[] }) {
  const byLine = new Map<number, RowIssue[]>();
  for (const issue of issues) {
    byLine.set(issue.line, [...(byLine.get(issue.line) ?? []), issue]);
  }

  const lines = [...byLine.keys()].sort((a, b) => a - b);
  const shown = lines.slice(0, ISSUE_ROW_LIMIT);

  return (
    <div className="overflow-hidden rounded-[12px] border border-warning">
      <div className="border-b border-border bg-warning-light px-4 py-3">
        <p className="text-[12.5px] font-semibold text-warning-foreground">
          {lines.length} row{lines.length === 1 ? "" : "s"} will be skipped
        </p>
        <p className="mt-0.5 text-[12px] text-warning-foreground/80">
          Each problem is listed with the column it is in. Fix them in the spreadsheet and upload
          again, or import the remaining rows now.
        </p>
      </div>

      <div className="max-h-72 overflow-y-auto overscroll-contain">
        {shown.map((line) => (
          <div key={line} className="border-b border-border-light px-4 py-2.5 last:border-b-0">
            <p className="font-mono text-[12px] font-semibold text-text-muted">Line {line}</p>
            <ul className="mt-1 flex flex-col gap-1">
              {byLine.get(line)!.map((issue, i) => (
                <li key={`${issue.column ?? "row"}-${i}`} className="text-[13px] text-text-secondary">
                  {issue.column && (
                    <span className="font-semibold text-text-primary">{issue.column}: </span>
                  )}
                  {issue.message}
                  {issue.value !== "" && (
                    <span className="text-text-muted">
                      {" — found "}
                      <span className="font-mono text-text-secondary">{issue.value}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {lines.length > shown.length && (
          <div className="px-4 py-2 text-[12.5px] text-text-muted">
            …and {lines.length - shown.length} more row
            {lines.length - shown.length === 1 ? "" : "s"} with problems
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Preview ──────────────────────────────────────────── */

const PREVIEW_ROWS = 5;
const PREVIEW_KEYS = [
  "customerName",
  "registrationNo",
  "installationDate",
  "imeiNo",
  "fmModule",
  "amountPaid",
];

function PreviewTable({ rows }: { rows: Record<string, string>[] }) {
  const previewColumns = PREVIEW_KEYS.map((key) =>
    INSTALLATION_COLUMNS.find((c) => c.key === key)
  ).filter((c) => c !== undefined);
  const shown = rows.slice(0, PREVIEW_ROWS);

  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        Preview — first {shown.length} of {rows.length}
      </p>
      <div className="overflow-x-auto rounded-[12px] border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface-muted">
              {previewColumns.map((column) => (
                <th
                  key={column.key}
                  className="whitespace-nowrap px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((row, i) => (
              <tr key={i} className={i < shown.length - 1 ? "border-b border-border-light" : ""}>
                {previewColumns.map((column) => (
                  <td
                    key={column.key}
                    className="whitespace-nowrap px-4 py-2.5 text-[13px] text-text-primary"
                  >
                    {row[column.key] === "" ? (
                      <span className="text-text-muted">—</span>
                    ) : (
                      row[column.key]
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
