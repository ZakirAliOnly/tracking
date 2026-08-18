"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, X } from "lucide-react";
import {
  RecordRenewalModal,
  type PreFill,
  type InstallationOption,
  type AccountOption,
} from "@/components/renewals/RecordRenewalModal";
import { Pagination } from "@/components/ui/Pagination";
import { buildHref } from "@/lib/pagination";

export type RenewalStatus = "received" | "due_soon" | "overdue" | "upcoming";

export type RenewalRow = {
  installationId: string;
  customerName: string;
  registrationNo: string;
  dueDateIso: string;
  accountName: string | null;
  accountId: string | null;
  status: RenewalStatus;
  daysUntilDue: number;
  // Recorded amounts (from last renewal record) — null if none yet
  amount: string | null;
  simOsting: string | null;
  net: string | null;
  other: string | null;
  // Pre-fill for the form
  prefillAmount: string;
  prefillSimOsting: string;
  prefillNet: string;
  nextRenewalDateIso: string; // current nextRenewalDate from installation (= dueDate)
};

type Filter = "pending" | "received" | "all";

type Props = {
  rows: RenewalRow[];
  accounts: AccountOption[];
  filter: Filter;
  page: number;
  total: number;
  dueSoonCount: number;
  from: string;
  to: string;
  searchParams: Record<string, string | undefined>;
};

/* ─── Helpers ──────────────────────────────────────────── */

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #E11D48 0%, #FB7185 100%)",
  "linear-gradient(135deg, #1A1414 0%, #4B4448 100%)",
  "linear-gradient(135deg, #9D174D 0%, #DB2777 100%)",
  "linear-gradient(135deg, #B0123A 0%, #F43F5E 100%)",
  "linear-gradient(135deg, #78123B 0%, #B0123A 100%)",
  "linear-gradient(135deg, #DC2626 0%, #F87171 100%)",
];
function getGradient(name: string) {
  const h = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}
function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
}

function fmtRs(v: string | null) {
  if (!v || parseFloat(v) === 0) return "—";
  return `Rs ${Math.round(parseFloat(v)).toLocaleString("en-PK")}`;
}

function StatusBadge({ status, daysUntilDue }: { status: RenewalStatus; daysUntilDue: number }) {
  if (status === "received")
    return <span className="inline-flex rounded-full bg-success-light px-2.5 py-1 text-xs font-semibold text-success-foreground">Received</span>;
  if (status === "overdue")
    return <span className="inline-flex rounded-full bg-error-light px-2.5 py-1 text-xs font-semibold text-error-foreground">Overdue {Math.abs(daysUntilDue)}d</span>;
  if (status === "due_soon")
    return <span className="inline-flex rounded-full bg-warning-light px-2.5 py-1 text-xs font-semibold text-warning-foreground">Due in {daysUntilDue}d</span>;
  return <span className="inline-flex rounded-full bg-surface-tertiary px-2.5 py-1 text-xs font-semibold text-text-secondary">Upcoming</span>;
}

const FILTER_LABELS: Record<Filter, string> = {
  pending: "Pending",
  received: "Received",
  all: "All",
};

const DATE_INPUT =
  "h-9 rounded-[9px] border border-border bg-surface px-3 text-[13px] text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors";

/* ─── Main view ────────────────────────────────────────── */

export function RenewalsView({
  rows,
  accounts,
  filter,
  page,
  total,
  dueSoonCount,
  from,
  to,
  searchParams,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPreFill, setDrawerPreFill] = useState<PreFill | null>(null);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerPreFill(null);
  }, []);

  const handleRecordRow = useCallback((row: RenewalRow) => {
    const dueIso = row.nextRenewalDateIso.slice(0, 10);
    const d = new Date(dueIso);
    d.setFullYear(d.getFullYear() + 1);
    setDrawerPreFill({
      installationId: row.installationId,
      customerName: row.customerName,
      registrationNo: row.registrationNo,
      accountId: row.accountId,
      dueDateDisplay: dueIso,
      nextRenewalDate: d.toISOString().slice(0, 10),
      amount: row.prefillAmount,
      simOsting: row.prefillSimOsting,
      net: row.prefillNet,
    });
    setDrawerOpen(true);
  }, []);

  const installationOptions: InstallationOption[] = rows.map((r) => ({
    id: r.installationId,
    customerName: r.customerName,
    registrationNo: r.registrationNo,
    accountId: r.accountId,
    prefillAmount: r.prefillAmount,
    prefillSimOsting: r.prefillSimOsting,
    prefillNet: r.prefillNet,
    nextRenewalDateIso: r.nextRenewalDateIso,
  }));

  return (
    <>
      <RecordRenewalModal
        open={drawerOpen}
        onClose={handleCloseDrawer}
        preFill={drawerPreFill}
        installationOptions={installationOptions}
        accounts={accounts}
      />

      {/* Toolbar */}
      <div className="mb-3 flex items-center justify-between">
        {/* Segmented filter */}
        <div className="flex items-center rounded-[9px] border border-border bg-surface p-1">
          {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
            <Link
              key={f}
              href={buildHref("/renewals", searchParams, { status: f === "pending" ? undefined : f })}
              className={`relative rounded-[7px] px-3.5 py-1.5 text-[13px] transition-colors ${
                filter === f
                  ? "bg-text-primary font-semibold text-white"
                  : "font-medium text-text-secondary hover:text-text-primary"
              }`}
            >
              {FILTER_LABELS[f]}
              {f === "pending" && dueSoonCount > 0 && (
                <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
                  {dueSoonCount}
                </span>
              )}
            </Link>
          ))}
        </div>

        <button
          onClick={() => { setDrawerPreFill(null); setDrawerOpen(true); }}
          className="flex h-9 items-center gap-2 rounded-[9px] bg-accent px-4 text-[13px] font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          style={{ boxShadow: "0 1px 2px rgba(225,29,72,0.20), 0 4px 12px -4px rgba(225,29,72,0.40)" }}
        >
          <Plus className="h-4 w-4" />
          Record renewal
        </button>
      </div>

      {/* Due-date range — a plain GET form, so it works the same way the filter
          tabs do and needs no client state. Omitting `page` resets to page 1 */}
      <form method="GET" action="/renewals" className="mb-5 flex flex-wrap items-center gap-2">
        {filter !== "pending" && <input type="hidden" name="status" value={filter} />}

        <span className="text-[12px] font-medium uppercase tracking-wider text-text-muted">
          Due between
        </span>
        <input
          type="date"
          name="from"
          defaultValue={from}
          aria-label="Due date from"
          className={DATE_INPUT}
        />
        <span className="text-[13px] text-text-muted">and</span>
        <input
          type="date"
          name="to"
          defaultValue={to}
          aria-label="Due date to"
          className={DATE_INPUT}
        />

        <button
          type="submit"
          className="flex h-9 items-center rounded-[9px] border border-border bg-surface px-3.5 text-[13px] font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
        >
          Apply
        </button>

        {(from || to) && (
          <Link
            href={buildHref("/renewals", searchParams, { from: undefined, to: undefined })}
            className="flex h-9 items-center gap-1 rounded-[9px] px-2.5 text-[13px] font-medium text-text-muted transition-colors hover:text-text-primary"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Link>
        )}
      </form>

      {/* Table card */}
      <div
        className="rounded-[20px] border border-border bg-surface"
        style={{ boxShadow: "0 1px 2px rgba(26,20,20,0.05), 0 6px 22px -8px rgba(26,20,20,0.14)" }}
      >
        {rows.length === 0 ? (
          <EmptyState filter={filter} ranged={Boolean(from || to)} />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Client","Reg No","Due Date","Amount","SIM & Osting","Net","Other","Account","Status",""].map((h) => (
                  <th key={h} className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted first:pl-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.installationId}
                  className={`transition-colors hover:bg-surface-muted ${
                    i < rows.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  {/* Client */}
                  <td className="pl-5 pr-4 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[9px] font-display text-[12px] font-bold text-white"
                        style={{ background: getGradient(row.customerName) }}
                      >
                        {getInitials(row.customerName)}
                      </div>
                      <span className="text-[14px] font-semibold text-text-primary">
                        {row.customerName}
                      </span>
                    </div>
                  </td>

                  {/* Reg No */}
                  <td className="px-4 py-4">
                    <span className="font-mono text-[13px] font-semibold text-text-primary">
                      {row.registrationNo}
                    </span>
                  </td>

                  {/* Due date */}
                  <td className="px-4 py-4">
                    <span className={`text-[13px] font-medium ${
                      row.status === "overdue" ? "text-error" : "text-text-primary"
                    }`}>
                      {fmtDate(row.dueDateIso)}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-4">
                    <span className="text-[14px] font-semibold text-text-primary">
                      {fmtRs(row.amount)}
                    </span>
                  </td>

                  {/* SIM & Osting */}
                  <td className="px-4 py-4">
                    <span className="text-[13px] text-text-secondary">{fmtRs(row.simOsting)}</span>
                  </td>

                  {/* Net */}
                  <td className="px-4 py-4">
                    <span className="text-[13px] text-text-secondary">{fmtRs(row.net)}</span>
                  </td>

                  {/* Other */}
                  <td className="px-4 py-4">
                    <span className="text-[13px] text-text-secondary">{fmtRs(row.other)}</span>
                  </td>

                  {/* Account */}
                  <td className="px-4 py-4">
                    {row.accountName ? (
                      <span className="inline-flex items-center rounded-full bg-accent-light px-2.5 py-1 text-xs font-semibold text-accent">
                        {row.accountName}
                      </span>
                    ) : (
                      <span className="text-[13px] text-text-muted">—</span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-4">
                    <StatusBadge status={row.status} daysUntilDue={row.daysUntilDue} />
                  </td>

                  {/* Record button */}
                  <td className="pl-2 pr-5 py-4">
                    {row.status !== "received" && (
                      <button
                        onClick={() => handleRecordRow(row)}
                        className="flex h-8 items-center gap-1.5 rounded-[9px] bg-accent-light px-3 text-[12px] font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Record
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {total > 0 && (
          <Pagination page={page} total={total} label="renewal" basePath="/renewals" searchParams={searchParams} />
        )}
      </div>
    </>
  );
}

function EmptyState({ filter, ranged }: { filter: Filter; ranged: boolean }) {
  const messages: Record<Filter, { title: string; sub: string }> = {
    pending: { title: "No pending renewals", sub: "Everything has been collected." },
    received: { title: "No received renewals", sub: "Record a renewal payment to see it here." },
    all: { title: "No renewals yet", sub: "Renewals appear here once installations are active." },
  };
  const { title, sub } = messages[filter];
  // A date range is far more likely to be why a list is empty than the filter
  const shownSub = ranged ? "Nothing falls due in the dates picked — widen the range or clear it." : sub;
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-accent-light">
        <RefreshCw className="h-7 w-7 text-accent" />
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold text-text-primary">{title}</p>
        <p className="mt-1 text-[13px] text-text-secondary">{shownSub}</p>
      </div>
    </div>
  );
}
