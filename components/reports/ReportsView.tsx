"use client";

import { useRef, useState, useTransition } from "react";
import {
  BarChart2, HardDrive, RefreshCw, Package, CreditCard, Archive, Printer, ChevronDown,
} from "lucide-react";
import {
  generateReport,
  type ReportType,
  type ReportResult,
  type OverviewRow,
  type InstallRow,
  type RenewalRow,
  type SupplierReportRow,
  type PaymentRow,
  type StockRow,
} from "@/actions/reports";

/* ─── Config ──────────────────────────────────────────────────── */

const REPORT_TYPES = [
  { id: "overview" as ReportType, label: "Overview", icon: BarChart2, desc: "Revenue, collections and balance due for a period" },
  { id: "installations" as ReportType, label: "Installations", icon: HardDrive, desc: "Detailed installation register with totals" },
  { id: "renewals" as ReportType, label: "Renewals", icon: RefreshCw, desc: "Renewal records with received/pending status" },
  { id: "suppliers" as ReportType, label: "Supplier Report", icon: Package, desc: "Purchase invoices and supplier payment summary" },
  { id: "payments" as ReportType, label: "Fund Transfers", icon: CreditCard, desc: "Transfers between payment methods for a period" },
  { id: "stock" as ReportType, label: "Stock Report", icon: Archive, desc: "Current device inventory by status and value" },
];

function today() { return new Date().toISOString().slice(0, 10); }
function startOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function startOfYear() { return `${new Date().getFullYear()}-01-01`; }
function lastMonthRange(): [string, string] {
  const d = new Date();
  const end = new Date(d.getFullYear(), d.getMonth(), 0);
  const start = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
}

const PRESETS = [
  { label: "Today", apply: (): [string, string] => [today(), today()] },
  { label: "This week", apply: (): [string, string] => {
    const d = new Date(); const day = d.getDay();
    const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7));
    return [mon.toISOString().slice(0, 10), today()];
  }},
  { label: "This month", apply: (): [string, string] => [startOfMonth(), today()] },
  { label: "Last month", apply: lastMonthRange },
  { label: "This year", apply: (): [string, string] => [startOfYear(), today()] },
];

/* ─── Helpers ─────────────────────────────────────────────────── */

function fmtRs(v: number) {
  if (!v) return "Rs 0";
  return `Rs ${Math.round(v).toLocaleString("en-PK")}`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
}

const INPUT = "h-9 rounded-[9px] border border-border bg-surface px-3 text-[13px] text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors";

/* ─── Main view ───────────────────────────────────────────────── */

export function ReportsView() {
  const [selected, setSelected] = useState<ReportType>("overview");
  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo] = useState(today());
  const [preset, setPreset] = useState("Today");
  const [result, setResult] = useState<ReportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const printRef = useRef<HTMLDivElement>(null);

  const selectedLabel = REPORT_TYPES.find(r => r.id === selected)?.label ?? "";

  const applyPreset = (p: typeof PRESETS[0]) => {
    const [f, t] = p.apply();
    setDateFrom(f);
    setDateTo(t);
    setPreset(p.label);
    setResult(null);
  };

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      const res = await generateReport(selected, dateFrom, dateTo);
      if (res.success && res.result) { setResult(res.result); }
      else { setError(res.error ?? "Failed to generate report"); setResult(null); }
    });
  };

  const handlePrint = () => {
    const el = printRef.current;
    if (!el) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>${selectedLabel}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, sans-serif; font-size: 13px; color: #111; padding: 24px; }
        h2 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
        p { color: #666; font-size: 12px; margin-bottom: 16px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px; }
        .stat { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; }
        .stat-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; }
        .stat-value { font-size: 20px; font-weight: 700; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; padding: 8px; border-bottom: 2px solid #e5e7eb; }
        td { padding: 8px; font-size: 13px; color: #374151; border-bottom: 1px solid #f3f4f6; }
        .right { text-align: right; }
      </style></head><body>${el.innerHTML}</body></html>`);
    win.document.close();
    win.print();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Report type cards */}
      <div className="grid grid-cols-3 gap-3">
        {REPORT_TYPES.map((rt) => {
          const isActive = selected === rt.id;
          return (
            <button
              key={rt.id}
              onClick={() => { setSelected(rt.id); setResult(null); }}
              className={`group relative flex flex-col gap-3 rounded-[16px] border p-5 text-left transition-all ${
                isActive
                  ? "border-accent bg-accent-light/20 shadow-sm"
                  : "border-border bg-surface hover:border-accent/40 hover:bg-surface-muted"
              }`}
              style={isActive ? { boxShadow: "0 0 0 2px rgba(45,107,255,0.15)" } : undefined}
            >
              {isActive && (
                <span className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current"><path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
              )}
              <div className={`flex h-10 w-10 items-center justify-center rounded-[11px] ${isActive ? "bg-accent" : "bg-surface-tertiary group-hover:bg-accent-light"}`}>
                <rt.icon className={`h-5 w-5 ${isActive ? "text-accent-foreground" : "text-text-muted group-hover:text-accent"}`} />
              </div>
              <div>
                <p className={`text-[14px] font-semibold ${isActive ? "text-accent-dark" : "text-text-primary"}`}>{rt.label}</p>
                <p className="mt-0.5 text-[12px] text-text-muted leading-[1.4]">{rt.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <div
        className="rounded-[16px] border border-border bg-surface px-5 py-4"
        style={{ boxShadow: "0 1px 2px rgba(15,27,45,0.05), 0 4px 16px -8px rgba(15,27,45,0.10)" }}
      >
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-accent">
          Filters — {selectedLabel}
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Date from</label>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPreset("Custom"); setResult(null); }} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Date to</label>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPreset("Custom"); setResult(null); }} className={INPUT} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Period preset</label>
            <div className="relative">
              <select
                value={preset}
                onChange={e => {
                  const p = PRESETS.find(x => x.label === e.target.value);
                  if (p) applyPreset(p);
                  else setPreset("Custom");
                }}
                className={INPUT + " appearance-none pr-7"}
              >
                {PRESETS.map(p => <option key={p.label}>{p.label}</option>)}
                <option>Custom</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            </div>
          </div>
          <div className="ml-auto flex items-end gap-2">
            <button
              onClick={handlePrint}
              disabled={!result}
              className="flex h-9 items-center gap-2 rounded-[9px] border border-border bg-surface px-4 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary disabled:opacity-40"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / PDF
            </button>
            <button
              onClick={handleGenerate}
              disabled={isPending}
              className="flex h-9 items-center gap-2 rounded-[9px] bg-accent px-5 text-[13px] font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ boxShadow: "0 1px 2px rgba(45,107,255,0.20), 0 4px 12px -4px rgba(45,107,255,0.40)" }}
            >
              {isPending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {isPending ? "Generating…" : "Generate report"}
            </button>
          </div>
        </div>
        {dateFrom && dateTo && (
          <p className="mt-2 text-[12px] text-text-muted">
            {fmtDate(dateFrom)} — {fmtDate(dateTo)}
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-[9px] bg-error-light px-4 py-3">
          <p className="text-[13px] font-medium text-error-foreground">{error}</p>
        </div>
      )}

      {/* Report output */}
      {result && (
        <div
          ref={printRef}
          className="rounded-[20px] border border-border bg-surface"
          style={{ boxShadow: "0 1px 2px rgba(15,27,45,0.05), 0 6px 22px -8px rgba(15,27,45,0.14)" }}
        >
          {result.type === "overview" && <OverviewReport data={result} label={selectedLabel} range={`${fmtDate(dateFrom)} — ${fmtDate(dateTo)}`} />}
          {result.type === "installations" && <InstallationsReport data={result} label={selectedLabel} range={`${fmtDate(dateFrom)} — ${fmtDate(dateTo)}`} />}
          {result.type === "renewals" && <RenewalsReport data={result} label={selectedLabel} range={`${fmtDate(dateFrom)} — ${fmtDate(dateTo)}`} />}
          {result.type === "suppliers" && <SuppliersReport data={result} label={selectedLabel} range={`${fmtDate(dateFrom)} — ${fmtDate(dateTo)}`} />}
          {result.type === "payments" && <PaymentsReport data={result} label={selectedLabel} range={`${fmtDate(dateFrom)} — ${fmtDate(dateTo)}`} />}
          {result.type === "stock" && <StockReport data={result} label={selectedLabel} range={`${fmtDate(dateFrom)} — ${fmtDate(dateTo)}`} />}
        </div>
      )}
    </div>
  );
}

/* ─── Shared sub-components ───────────────────────────────────── */

function ReportHeader({ label, range }: { label: string; range: string }) {
  return (
    <div className="border-b border-border px-6 py-5">
      <h2 className="font-display text-[16px] font-semibold text-text-primary uppercase tracking-wide">{label}</h2>
      <p className="mt-0.5 text-[12px] text-text-muted">{range}</p>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[14px] border border-border bg-background px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{label}</p>
      <p className={`font-display text-[22px] font-bold leading-7 ${accent ?? "text-text-primary"}`}>{value}</p>
    </div>
  );
}

const TH = "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted first:pl-5 last:pr-5";
const TD = "px-4 py-3 text-[13px] text-text-primary first:pl-5 last:pr-5";

function EmptyRows() {
  return (
    <tr><td colSpan={20} className="py-12 text-center text-[13px] text-text-muted">No records found for this period.</td></tr>
  );
}

/* ─── Overview ────────────────────────────────────────────────── */

function OverviewReport({ data, label, range }: { data: Extract<ReportResult, { type: "overview" }>; label: string; range: string }) {
  const { stats, rows } = data;
  return (
    <>
      <ReportHeader label={label} range={range} />
      <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
        <StatCard label="Installations" value={String(stats.totalInstallations)} />
        <StatCard label="Renewals" value={String(stats.totalRenewals)} />
        <StatCard label="Total Revenue" value={fmtRs(stats.totalRevenue)} accent="text-accent" />
        <StatCard label="Balance Due" value={fmtRs(Math.max(0, stats.balanceDue))} accent={stats.balanceDue > 0 ? "text-error" : "text-text-primary"} />
      </div>
      <div className="overflow-x-auto border-t border-border">
        <table className="w-full">
          <thead><tr className="border-b border-border bg-surface-muted">
            {["Type","Customer","Vehicle","Device","Date","Revenue","Collected","Remaining"].map(h =>
              <th key={h} className={TH}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.length === 0 ? <EmptyRows /> : rows.map((r: OverviewRow, i) => (
              <tr key={r.id} className={`transition-colors hover:bg-surface-muted ${i < rows.length - 1 ? "border-b border-border" : ""}`}>
                <td className={TD}>
                  <span className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold ${r.type === "Installation" ? "bg-accent-light text-accent" : "bg-success-light text-success-foreground"}`}>{r.type}</span>
                </td>
                <td className={TD + " font-medium"}>{r.customer}</td>
                <td className={TD + " text-text-secondary"}>{r.vehicle}</td>
                <td className={TD + " text-text-secondary"}>{r.device}</td>
                <td className={TD + " text-text-muted text-[12px]"}>{fmtDate(r.date)}</td>
                <td className={TD + " font-semibold"}>{r.revenue > 0 ? fmtRs(r.revenue) : "—"}</td>
                <td className={TD + " text-success-foreground font-medium"}>{r.collected > 0 ? fmtRs(r.collected) : "—"}</td>
                <td className={TD + (r.remaining > 0 ? " text-error font-semibold" : " text-text-muted")}>{r.remaining > 0 ? fmtRs(r.remaining) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-border px-5 py-3">
          <p className="text-[12px] text-text-muted">Showing {rows.length} records</p>
        </div>
      </div>
    </>
  );
}

/* ─── Installations ───────────────────────────────────────────── */

function InstallationsReport({ data, label, range }: { data: Extract<ReportResult, { type: "installations" }>; label: string; range: string }) {
  const { stats, rows } = data;
  return (
    <>
      <ReportHeader label={label} range={range} />
      <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
        <StatCard label="Installations" value={String(stats.count)} />
        <StatCard label="Total Revenue" value={fmtRs(stats.totalRevenue)} accent="text-accent" />
        <StatCard label="Collected" value={fmtRs(stats.totalCollected)} accent="text-success-foreground" />
        <StatCard label="Balance Due" value={fmtRs(stats.balanceDue)} accent={stats.balanceDue > 0 ? "text-error" : "text-text-primary"} />
      </div>
      <div className="overflow-x-auto border-t border-border">
        <table className="w-full min-w-[800px]">
          <thead><tr className="border-b border-border bg-surface-muted">
            {["Customer","Reg No","Vehicle","Device","IMEI","Date","Total","Paid","Remaining"].map(h =>
              <th key={h} className={TH}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.length === 0 ? <EmptyRows /> : rows.map((r: InstallRow, i) => (
              <tr key={r.id} className={`transition-colors hover:bg-surface-muted ${i < rows.length - 1 ? "border-b border-border" : ""}`}>
                <td className={TD + " font-semibold"}>{r.customer}</td>
                <td className={TD + " font-mono text-[12px]"}>{r.regNo}</td>
                <td className={TD + " text-text-secondary"}>{r.vehicle}</td>
                <td className={TD + " text-text-secondary"}>{r.device}</td>
                <td className={TD + " font-mono text-[12px] text-text-muted"}>{r.imeiNo ?? "—"}</td>
                <td className={TD + " text-[12px] text-text-muted"}>{fmtDate(r.date)}</td>
                <td className={TD + " font-semibold"}>{fmtRs(r.total)}</td>
                <td className={TD + " text-success-foreground font-medium"}>{r.paid > 0 ? fmtRs(r.paid) : "—"}</td>
                <td className={TD + (r.remaining > 0 ? " text-error font-semibold" : " text-text-muted")}>{r.remaining > 0 ? fmtRs(r.remaining) : "Paid"}</td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr className="border-t-2 border-border bg-surface-muted font-semibold">
                <td className={TD + " font-bold"} colSpan={6}>Total ({rows.length})</td>
                <td className={TD + " font-bold"}>{fmtRs(stats.totalRevenue)}</td>
                <td className={TD + " text-success-foreground font-bold"}>{fmtRs(stats.totalCollected)}</td>
                <td className={TD + " text-error font-bold"}>{fmtRs(stats.balanceDue)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ─── Renewals ────────────────────────────────────────────────── */

function RenewalsReport({ data, label, range }: { data: Extract<ReportResult, { type: "renewals" }>; label: string; range: string }) {
  const { stats, rows } = data;
  return (
    <>
      <ReportHeader label={label} range={range} />
      <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
        <StatCard label="Total Renewals" value={String(stats.count)} />
        <StatCard label="Received" value={String(stats.received)} accent="text-success-foreground" />
        <StatCard label="Pending" value={String(stats.pending)} accent={stats.pending > 0 ? "text-error" : "text-text-primary"} />
        <StatCard label="Revenue Received" value={fmtRs(stats.totalReceived)} accent="text-accent" />
      </div>
      <div className="overflow-x-auto border-t border-border">
        <table className="w-full">
          <thead><tr className="border-b border-border bg-surface-muted">
            {["Customer","Reg No","Date","Amount","Status"].map(h =>
              <th key={h} className={TH}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.length === 0 ? <EmptyRows /> : rows.map((r: RenewalRow, i) => (
              <tr key={r.id} className={`transition-colors hover:bg-surface-muted ${i < rows.length - 1 ? "border-b border-border" : ""}`}>
                <td className={TD + " font-semibold"}>{r.customer}</td>
                <td className={TD + " font-mono text-[12px]"}>{r.regNo}</td>
                <td className={TD + " text-[12px] text-text-muted"}>{fmtDate(r.date)}</td>
                <td className={TD + " font-semibold"}>{fmtRs(r.amount)}</td>
                <td className={TD}>
                  <span className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold ${r.received ? "bg-success-light text-success-foreground" : "bg-warning-light text-warning-foreground"}`}>
                    {r.received ? "Received" : "Pending"}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr className="border-t-2 border-border bg-surface-muted">
                <td className={TD + " font-bold"} colSpan={3}>Total ({rows.length})</td>
                <td className={TD + " font-bold"}>{fmtRs(stats.totalReceived + stats.totalPending)}</td>
                <td className={TD}></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ─── Suppliers ───────────────────────────────────────────────── */

function SuppliersReport({ data, label, range }: { data: Extract<ReportResult, { type: "suppliers" }>; label: string; range: string }) {
  const { stats, rows } = data;
  return (
    <>
      <ReportHeader label={label} range={range} />
      <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
        <StatCard label="Invoices" value={String(stats.invoiceCount)} />
        <StatCard label="Total Value" value={fmtRs(stats.totalValue)} accent="text-accent" />
        <StatCard label="Total Paid" value={fmtRs(stats.totalPaid)} accent="text-success-foreground" />
        <StatCard label="Balance Due" value={fmtRs(stats.balanceDue)} accent={stats.balanceDue > 0 ? "text-error" : "text-text-primary"} />
      </div>
      <div className="overflow-x-auto border-t border-border">
        <table className="w-full">
          <thead><tr className="border-b border-border bg-surface-muted">
            {["Supplier","Device","Qty","Total","Paid","Remaining","Date"].map(h =>
              <th key={h} className={TH}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.length === 0 ? <EmptyRows /> : rows.map((r: SupplierReportRow, i) => (
              <tr key={r.id} className={`transition-colors hover:bg-surface-muted ${i < rows.length - 1 ? "border-b border-border" : ""}`}>
                <td className={TD + " font-semibold"}>{r.supplier}</td>
                <td className={TD + " text-text-secondary"}>{r.device}</td>
                <td className={TD}>{r.qty}</td>
                <td className={TD + " font-semibold"}>{fmtRs(r.total)}</td>
                <td className={TD + " text-success-foreground font-medium"}>{r.paid > 0 ? fmtRs(r.paid) : "—"}</td>
                <td className={TD + (r.remaining > 0 ? " text-error font-semibold" : " text-text-muted")}>{r.remaining > 0 ? fmtRs(r.remaining) : "Paid"}</td>
                <td className={TD + " text-[12px] text-text-muted"}>{fmtDate(r.date)}</td>
              </tr>
            ))}
            {rows.length > 0 && (
              <tr className="border-t-2 border-border bg-surface-muted">
                <td className={TD + " font-bold"} colSpan={3}>Total ({rows.length})</td>
                <td className={TD + " font-bold"}>{fmtRs(stats.totalValue)}</td>
                <td className={TD + " text-success-foreground font-bold"}>{fmtRs(stats.totalPaid)}</td>
                <td className={TD + " text-error font-bold"}>{fmtRs(stats.balanceDue)}</td>
                <td className={TD}></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ─── Fund Transfers ──────────────────────────────────────────── */

function PaymentsReport({ data, label, range }: { data: Extract<ReportResult, { type: "payments" }>; label: string; range: string }) {
  const { stats, rows } = data;
  return (
    <>
      <ReportHeader label={label} range={range} />
      <div className="grid grid-cols-2 gap-3 p-5">
        <StatCard label="Transfers" value={String(stats.transferCount)} />
        <StatCard label="Total Moved" value={fmtRs(stats.totalMoved)} accent="text-accent" />
      </div>
      <div className="overflow-x-auto border-t border-border">
        <table className="w-full">
          <thead><tr className="border-b border-border bg-surface-muted">
            {["Date","From","To","Amount","Note"].map(h => <th key={h} className={TH}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.length === 0 ? <EmptyRows /> : rows.map((r: PaymentRow, i) => (
              <tr key={r.id} className={`transition-colors hover:bg-surface-muted ${i < rows.length - 1 ? "border-b border-border" : ""}`}>
                <td className={TD + " text-[12px] text-text-muted"}>{fmtDate(r.date)}</td>
                <td className={TD + " font-semibold"}>{r.from}</td>
                <td className={TD + " font-semibold"}>{r.to}</td>
                <td className={TD + " text-error font-semibold"}>{fmtRs(r.amount)}</td>
                <td className={TD + " text-text-muted"}>{r.note ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-border px-5 py-3">
          <p className="text-[12px] text-text-muted">Showing {rows.length} {rows.length === 1 ? "transfer" : "transfers"}</p>
        </div>
      </div>
    </>
  );
}

/* ─── Stock ───────────────────────────────────────────────────── */

const STATUS_STYLE: Record<string, string> = {
  in_stock: "bg-success-light text-success-foreground",
  installed: "bg-accent-light text-accent",
  faulty: "bg-error-light text-error-foreground",
  returned: "bg-surface-tertiary text-text-secondary",
};

function StockReport({ data, label, range }: { data: Extract<ReportResult, { type: "stock" }>; label: string; range: string }) {
  const { stats, rows } = data;
  return (
    <>
      <ReportHeader label={label} range={range} />
      <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
        <StatCard label="Total Records" value={String(stats.total)} />
        <StatCard label="Units In Stock" value={String(stats.inStock)} accent="text-success-foreground" />
        <StatCard label="Installed" value={String(stats.installed)} accent="text-accent" />
        <StatCard label="Stock Cost Value" value={fmtRs(stats.totalCostValue)} accent="text-text-primary" />
      </div>
      <div className="overflow-x-auto border-t border-border">
        <table className="w-full">
          <thead><tr className="border-b border-border bg-surface-muted">
            {["Device / FM Module","IMEI","Status","Cost Price","Sale Price","Qty"].map(h =>
              <th key={h} className={TH}>{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.length === 0 ? <EmptyRows /> : rows.map((r: StockRow, i) => (
              <tr key={r.id} className={`transition-colors hover:bg-surface-muted ${i < rows.length - 1 ? "border-b border-border" : ""}`}>
                <td className={TD + " font-semibold"}>{r.name}</td>
                <td className={TD + " font-mono text-[12px] text-text-muted"}>{r.imeiNo ?? "—"}</td>
                <td className={TD}>
                  <span className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold ${STATUS_STYLE[r.status] ?? "bg-surface-tertiary text-text-secondary"}`}>
                    {r.status.replace("_", " ")}
                  </span>
                </td>
                <td className={TD}>{r.costPrice != null ? fmtRs(r.costPrice) : "—"}</td>
                <td className={TD}>{r.salePrice != null ? fmtRs(r.salePrice) : "—"}</td>
                <td className={TD + " font-semibold"}>{r.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t border-border px-5 py-3">
          <p className="text-[12px] text-text-muted">Showing {rows.length} device records</p>
        </div>
      </div>
    </>
  );
}
