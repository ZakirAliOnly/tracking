"use client";

import Link from "next/link";
import { BarChart2, Coins, Signal, TrendingUp, X } from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";
import { buildHref } from "@/lib/pagination";
import { EditSaleTrigger } from "@/components/sales/EditSaleModal";

export type SalesRow = {
  id: string;
  customerName: string;
  registrationNo: string;
  installationDate: string;
  amount: string;
  simPayment: string;
  devicePayment: string;
  /** What is left of Amount once Sim and Device are taken out — can go negative. */
  totalSale: string;
};

type Props = {
  rows: SalesRow[];
  page: number;
  total: number;
  totalAmount: number;
  totalSim: number;
  totalDevice: number;
  totalSale: number;
  from: string;
  to: string;
  searchParams: Record<string, string | undefined>;
};

const DATE_INPUT =
  "h-9 rounded-[9px] border border-border bg-surface px-3 text-[13px] text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(-2)}`;
}

function fmtRs(v: number | string) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return `Rs ${Math.round(n || 0).toLocaleString("en-PK")}`;
}

/** A dash reads better than "Rs 0" down a column of real figures. */
function fmtCell(v: string) {
  return parseFloat(v) === 0 ? "—" : fmtRs(v);
}

/** Sim + Device can exceed Amount on a row, so Total Sale can go negative. */
function totalSaleClass(v: string) {
  return parseFloat(v) < 0 ? "text-error" : "text-success-foreground";
}

export function SalesReportView({
  rows,
  page,
  total,
  totalAmount,
  totalSim,
  totalDevice,
  totalSale,
  from,
  to,
  searchParams,
}: Props) {
  const ranged = Boolean(from || to);

  return (
    <>
      {/* KPIs — Total Sale leads, since that is the figure the report exists for */}
      <div className="mb-5 grid grid-cols-4 gap-4">
        <Kpi icon={Coins} label="Amount total" value={fmtRs(totalAmount)} />
        <Kpi icon={Signal} label="Sim total" value={fmtRs(totalSim)} />
        <Kpi icon={BarChart2} label="Device total" value={fmtRs(totalDevice)} />
        <Kpi
          icon={TrendingUp}
          label="Total Sale"
          value={fmtRs(totalSale)}
          hint="Amount less Sim and Device"
          accent={totalSale < 0 ? "error" : "success"}
        />
      </div>

      {/* Date range — the same plain GET form the Renewals page uses */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <form method="GET" action="/sales-report" className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-medium uppercase tracking-wider text-text-muted">
            Installed between
          </span>
          <input type="date" name="from" defaultValue={from} aria-label="Installed from" className={DATE_INPUT} />
          <span className="text-[13px] text-text-muted">and</span>
          <input type="date" name="to" defaultValue={to} aria-label="Installed to" className={DATE_INPUT} />

          <button
            type="submit"
            className="flex h-9 items-center rounded-[9px] border border-border bg-surface px-3.5 text-[13px] font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
          >
            Apply
          </button>

          {ranged && (
            <Link
              href={buildHref("/sales-report", searchParams, { from: undefined, to: undefined })}
              className="flex h-9 items-center gap-1 rounded-[9px] px-2.5 text-[13px] font-medium text-text-muted transition-colors hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Link>
          )}
        </form>

        <EditSaleTrigger />
      </div>

      {/* Table */}
      <div
        className="rounded-[20px] border border-border bg-surface"
        style={{ boxShadow: "0 1px 2px rgba(26,20,20,0.05), 0 6px 22px -8px rgba(26,20,20,0.14)" }}
      >
        {rows.length === 0 ? (
          <EmptyState ranged={ranged} />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Client", "Reg No", "Install Date", "Amount", "Sim", "Device", "Total Sale"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted first:pl-5"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.id}
                  className={`transition-colors hover:bg-surface-muted ${
                    i < rows.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <td className="pl-5 pr-4 py-3.5">
                    <span className="text-[14px] font-semibold text-text-primary">
                      {row.customerName}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-mono text-[13px] font-semibold text-text-primary">
                      {row.registrationNo}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-[13px] text-text-secondary">
                      {fmtDate(row.installationDate)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-[13px] font-medium text-text-primary tabular-nums">
                      {fmtCell(row.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-[13px] font-medium text-text-primary tabular-nums">
                      {fmtCell(row.simPayment)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-[13px] font-medium text-text-primary tabular-nums">
                      {fmtCell(row.devicePayment)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-[13px] font-semibold tabular-nums ${totalSaleClass(row.totalSale)}`}>
                      {fmtCell(row.totalSale)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {total > 0 && (
          <Pagination
            page={page}
            total={total}
            label="installation"
            basePath="/sales-report"
            searchParams={searchParams}
          />
        )}
      </div>
    </>
  );
}

/* ─── Pieces ───────────────────────────────────────────── */

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
  accent?: "success" | "error";
}) {
  const accentClass = accent === "error" ? "text-error" : "text-success-foreground";
  return (
    <div
      className="flex flex-col gap-1 rounded-[16px] border border-border bg-surface px-5 py-4"
      style={{ boxShadow: "0 1px 2px rgba(26,20,20,0.05), 0 4px 16px -8px rgba(26,20,20,0.10)" }}
    >
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${accent ? accentClass : "text-text-muted"}`} />
        <p className="text-[12.5px] font-medium text-text-secondary">{label}</p>
      </div>
      <p
        className={`font-display text-[26px] font-bold leading-8 tabular-nums ${
          accent ? accentClass : "text-text-primary"
        }`}
      >
        {value}
      </p>
      {hint && <p className="text-[11.5px] text-text-muted">{hint}</p>}
    </div>
  );
}

function EmptyState({ ranged }: { ranged: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-accent-light">
        <BarChart2 className="h-7 w-7 text-accent" />
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold text-text-primary">
          {ranged ? "No installations in these dates" : "No installations yet"}
        </p>
        <p className="mt-1 text-[13px] text-text-secondary">
          {ranged
            ? "Widen the range or clear it to see everything."
            : "Record an installation and its figures appear here."}
        </p>
      </div>
    </div>
  );
}
