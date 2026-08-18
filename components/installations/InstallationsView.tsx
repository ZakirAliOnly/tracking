"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronDown, HardDrive, Plus, Search, Upload, Wallet, X } from "lucide-react";
import {
  NewInstallationModal,
  type CustomerOption,
} from "@/components/installations/NewInstallationModal";
import { ImportCsvModal } from "@/components/installations/ImportCsvModal";
import { PayBalanceModal, type PayTarget } from "@/components/installations/PayBalanceModal";
import { Pagination } from "@/components/ui/Pagination";
import { buildHref, PAGE_SIZE } from "@/lib/pagination";
import type { AccountOption } from "@/lib/accounts";
import type { InstallableDevice } from "@/lib/device-options";


export type InstallationContact = { name: string; mobile: string };

export type InstallationRow = {
  id: string;
  customerName: string;
  remarks: string | null;
  contacts: InstallationContact[];
  vehicleDescription: string;
  registrationNo: string;
  simNo: string | null;
  received: boolean;
  amount: string;
  simPayment: string;
  discount: string;
  amountPaid: string;
  fittedDevices: { name: string; quantity: number; unitPrice: string }[];
  imeiNo: string | null;
  gsmNo: string | null;
  gsmNoAlt: string | null;
  fmModule: string | null;
  cutOff: string | null;
  engineNo: string | null;
  chassisNo: string | null;
  colour: string | null;
  installationDate: string;
  totalAmount: string | null;
  accountName: string | null;
  nextRenewalDate: string;
  status: string;
  isRenewalDue: boolean;
};

type Filter = "all" | "active" | "suspended";

type Props = {
  installations: InstallationRow[];
  customers: CustomerOption[];
  accounts: AccountOption[];
  devices: InstallableDevice[];
  filter: Filter;
  page: number;
  total: number;
  query: string;
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

function getGradient(name: string): string {
  const hash = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`;
}

function fmtDateFull(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtRupees(amount: string | null): string {
  if (!amount) return "—";
  const n = Math.round(parseFloat(amount));
  return `Rs ${n.toLocaleString("en-PK")}`;
}

/**
 * What is still owed: the generated total, less the discount and what was paid.
 * CSV-imported rows carry `received` without an amount paid, so a settled row is
 * never shown as still owing.
 */
function remaining(inst: InstallationRow): string {
  if (inst.received) return "0";
  const owed =
    parseFloat(inst.totalAmount ?? "0") - parseFloat(inst.discount) - parseFloat(inst.amountPaid);
  return String(Math.max(owed, 0));
}

function PaidPill({ received, amountPaid }: { received: boolean; amountPaid: string }) {
  if (received)
    return (
      <span className="inline-flex items-center rounded-full bg-success-light px-2.5 py-1 text-xs font-semibold text-success-foreground">
        Received
      </span>
    );

  if (parseFloat(amountPaid) > 0)
    return (
      <span className="inline-flex items-center rounded-full bg-accent-light px-2.5 py-1 text-xs font-semibold text-accent-dark">
        Part paid
      </span>
    );

  return (
    <span className="inline-flex items-center rounded-full bg-warning-light px-2.5 py-1 text-xs font-semibold text-warning-foreground">
      Pending
    </span>
  );
}

type StatusKey = "active" | "renewal_due" | "suspended";

function StatusPill({ status, isRenewalDue }: { status: string; isRenewalDue: boolean }) {
  const key: StatusKey =
    status === "suspended" ? "suspended" : isRenewalDue ? "renewal_due" : "active";

  if (key === "active")
    return (
      <span className="inline-flex items-center rounded-full bg-success-light px-2.5 py-1 text-xs font-semibold text-success-foreground">
        Active
      </span>
    );
  if (key === "renewal_due")
    return (
      <span className="inline-flex items-center rounded-full bg-warning-light px-2.5 py-1 text-xs font-semibold text-warning-foreground">
        Renewal due
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full bg-surface-tertiary px-2.5 py-1 text-xs font-semibold text-text-secondary">
      Suspended
    </span>
  );
}

/* ─── Main view ────────────────────────────────────────── */

export function InstallationsView({
  installations,
  customers,
  accounts,
  devices,
  filter,
  page,
  total,
  query,
  searchParams,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null);

  const openPay = (inst: InstallationRow) =>
    setPayTarget({
      installationId: inst.id,
      registrationNo: inst.registrationNo,
      customerName: inst.customerName,
      remaining: remaining(inst),
    });

  const searching = query !== "";

  return (
    <>
      <NewInstallationModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        customers={customers}
        accounts={accounts}
        devices={devices}
      />

      <ImportCsvModal open={importOpen} onClose={() => setImportOpen(false)} />

      <PayBalanceModal
        open={payTarget !== null}
        onClose={() => setPayTarget(null)}
        target={payTarget}
      />

      {/* Toolbar */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center rounded-[9px] border border-border bg-surface p-1">
          {(["all", "active", "suspended"] as const).map((f) => (
            <Link
              key={f}
              href={buildHref("/installations", searchParams, { status: f === "all" ? undefined : f })}
              className={`rounded-[7px] px-3.5 py-1.5 text-[13px] transition-colors ${
                filter === f
                  ? "bg-text-primary font-semibold text-white"
                  : "font-medium text-text-secondary hover:text-text-primary"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setImportOpen(true)}
            className="flex h-9 items-center gap-2 rounded-[9px] border border-border bg-surface px-4 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="flex h-9 items-center gap-2 rounded-[9px] bg-accent px-4 text-[13px] font-semibold text-accent-foreground transition-opacity hover:opacity-90"
            style={{
              boxShadow: "0 1px 2px rgba(225,29,72,0.20), 0 4px 12px -4px rgba(225,29,72,0.40)",
            }}
          >
            <Plus className="h-4 w-4" />
            New installation
          </button>
        </div>
      </div>

      {/* Search — a plain GET form, matching the filter tabs' URL-driven
          approach. Omitting `page` resets to page 1 on every new search */}
      <form method="GET" action="/installations" className="mb-5 flex flex-wrap items-center gap-2">
        {filter !== "all" && <input type="hidden" name="status" value={filter} />}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search by Registration No or IMEI"
            aria-label="Search by registration number or IMEI"
            className="h-9 w-[320px] rounded-[9px] border border-border bg-surface pl-9 pr-3 text-[13px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors"
          />
        </div>

        <button
          type="submit"
          className="flex h-9 items-center rounded-[9px] border border-border bg-surface px-3.5 text-[13px] font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
        >
          Search
        </button>

        {query && (
          <>
            <Link
              href={buildHref("/installations", searchParams, { q: undefined })}
              className="flex h-9 items-center gap-1 rounded-[9px] px-2.5 text-[13px] font-medium text-text-muted transition-colors hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </Link>
            <span className="text-[12.5px] text-text-secondary">
              {total} result{total === 1 ? "" : "s"} for{" "}
              <span className="font-mono font-semibold text-text-primary">{query}</span>
            </span>
          </>
        )}
      </form>

      {/* A search is a lookup, so every match opens straight into its full
          record rather than a row that has to be expanded again */}
      {searching && installations.length > 0 ? (
        <div className="flex flex-col gap-4">
          {installations.map((inst) => (
            <DetailPanel key={inst.id} inst={inst} onPay={() => openPay(inst)} />
          ))}
          {total > PAGE_SIZE && (
            <div
              className="rounded-[20px] border border-border bg-surface"
              style={{ boxShadow: "0 1px 2px rgba(26,20,20,0.05), 0 6px 22px -8px rgba(26,20,20,0.14)" }}
            >
              <Pagination
                page={page}
                total={total}
                label="installation"
                basePath="/installations"
                searchParams={searchParams}
              />
            </div>
          )}
        </div>
      ) : (
      /* Table card */
      <div
        className="rounded-[20px] border border-border bg-surface"
        style={{
          boxShadow: "0 1px 2px rgba(26,20,20,0.05), 0 6px 22px -8px rgba(26,20,20,0.14)",
        }}
      >
        {installations.length === 0 ? (
          <EmptyState filter={filter} query={query} onAdd={() => setModalOpen(true)} />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">Client</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">Vehicle</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">Reg No</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">Sim No</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">Install Date</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">Total</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">Received</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">Status</th>
                <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-wide text-text-muted" />
              </tr>
            </thead>
            <tbody>
              {installations.map((inst, i) => (
                <Fragment key={inst.id}>
                  <tr
                    onClick={() => setExpandedId(expandedId === inst.id ? null : inst.id)}
                    className={`cursor-pointer transition-colors hover:bg-surface-muted ${
                      i < installations.length - 1 || expandedId === inst.id ? "border-b border-border" : ""
                    } ${expandedId === inst.id ? "bg-surface-muted" : ""}`}
                  >
                    {/* Client */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[9px] font-display text-[12px] font-bold text-white"
                          style={{ background: getGradient(inst.customerName) }}
                        >
                          {getInitials(inst.customerName)}
                        </div>
                        <span className="text-[14px] font-semibold text-text-primary">
                          {inst.customerName}
                        </span>
                      </div>
                    </td>

                    {/* Vehicle */}
                    <td className="px-5 py-4">
                      <span className="text-[14px] text-text-primary">{inst.vehicleDescription}</span>
                    </td>

                    {/* Reg No */}
                    <td className="px-5 py-4">
                      <span className="font-mono text-[13px] font-semibold text-text-primary">
                        {inst.registrationNo}
                      </span>
                    </td>

                    {/* IMEI */}
                    <td className="px-5 py-4">
                      <span className="font-mono text-[13px] text-text-secondary">
                        {inst.simNo ?? "—"}
                      </span>
                    </td>

                    {/* Install date */}
                    <td className="px-5 py-4">
                      <span className="text-[13px] text-text-primary">
                        {fmtDate(inst.installationDate)}
                      </span>
                    </td>

                    {/* Total */}
                    <td className="px-5 py-4">
                      <span className="text-[14px] font-semibold text-text-primary">
                        {fmtRupees(inst.totalAmount)}
                      </span>
                    </td>

                    {/* Received */}
                    <td className="px-5 py-4">
                      <PaidPill received={inst.received} amountPaid={inst.amountPaid} />
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <StatusPill status={inst.status} isRenewalDue={inst.isRenewalDue} />
                    </td>

                    {/* Expand toggle */}
                    <td className="px-4 py-4 text-right">
                      <ChevronDown
                        className={`h-4 w-4 text-text-muted transition-transform duration-200 ${
                          expandedId === inst.id ? "rotate-180" : ""
                        }`}
                      />
                    </td>
                  </tr>

                  {/* Expandable detail panel */}
                  {expandedId === inst.id && (
                    <tr className="bg-surface-muted">
                      <td colSpan={9} className="px-6 pb-5 pt-4">
                        <DetailPanel inst={inst} onPay={() => openPay(inst)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
        {total > 0 && (
          <Pagination
            page={page}
            total={total}
            label="installation"
            basePath="/installations"
            searchParams={searchParams}
          />
        )}
      </div>
      )}
    </>
  );
}

/* ─── Detail panel ─────────────────────────────────────── */

/** A boxed heading, the way the old tracker sheet labelled each block. */
function PanelLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[8px] border border-border bg-surface-muted px-3 py-1.5 text-center text-[12px] font-semibold text-text-primary">
      {children}
    </div>
  );
}

/** One `label: value` pair on its own bordered line. */
function FieldRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex items-stretch border-b border-border-light last:border-b-0">
      <div className="w-[46%] flex-none border-r border-border-light px-3 py-2 text-[12.5px] text-text-secondary">
        {label}
      </div>
      <div
        className={`flex-1 px-3 py-2 text-[13px] font-medium text-text-primary ${mono ? "font-mono" : ""}`}
      >
        {value && value.trim() !== "" ? value : <span className="text-text-muted">—</span>}
      </div>
    </div>
  );
}

/**
 * The record as the team reads it on the old tracker sheet — remarks and
 * installation date across the top, then who to call on the left against what
 * is fitted to the car on the right. Used both when a row is expanded and for
 * search results, so a plate or IMEI lookup lands on exactly this view.
 */
function DetailPanel({ inst, onPay }: { inst: InstallationRow; onPay: () => void }) {
  const owed = parseFloat(remaining(inst));

  return (
    <div
      className="rounded-[14px] border border-border bg-surface p-5"
      style={{ boxShadow: "0 1px 2px rgba(26,20,20,0.05), 0 4px 12px -4px rgba(26,20,20,0.10)" }}
    >
      {/* Panel header */}
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[15px] font-semibold text-text-primary">
            {inst.registrationNo} · {inst.customerName}
          </p>
          <p className="mt-0.5 text-[13px] text-text-secondary">
            {inst.vehicleDescription} · Next renewal {fmtDateFull(inst.nextRenewalDate)}
          </p>
        </div>
        <StatusPill status={inst.status} isRenewalDue={inst.isRenewalDue} />
      </div>

      {/* Remarks + installation date */}
      <div className="mb-4 grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <PanelLabel>Remarks</PanelLabel>
          <span className="flex-1 border-b border-border pb-1 text-[13px] text-text-primary">
            {inst.remarks?.trim() ? inst.remarks : <span className="text-text-muted">—</span>}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <PanelLabel>Installation Date</PanelLabel>
          <span className="flex-1 border-b border-border pb-1 text-[13px] font-semibold text-text-primary">
            {fmtDateFull(inst.installationDate)}
          </span>
        </div>
      </div>

      {/* Contact information | Car description */}
      <div className="grid grid-cols-2 gap-4">
        <section className="flex flex-col gap-2">
          <PanelLabel>Contact Information</PanelLabel>
          <div className="overflow-hidden rounded-[10px] border border-border">
            <div className="flex border-b border-border bg-surface-muted">
              <div className="w-[46%] flex-none border-r border-border-light px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                Names of Contact
              </div>
              <div className="flex-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                Mobile Number
              </div>
            </div>
            {inst.contacts.length === 0 ? (
              <p className="px-3 py-3 text-[12.5px] text-text-muted">No contacts recorded</p>
            ) : (
              inst.contacts.map((c, i) => (
                <FieldRow key={i} label={c.name} value={c.mobile} mono />
              ))
            )}
          </div>
          <div className="overflow-hidden rounded-[10px] border border-border">
            <FieldRow label="IMEI Number" value={inst.imeiNo} mono />
            <FieldRow label="Sim Number" value={inst.simNo} mono />
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <PanelLabel>Car Description</PanelLabel>
          <div className="overflow-hidden rounded-[10px] border border-border">
            <div className="flex border-b border-border bg-surface-muted">
              <div className="w-[46%] flex-none border-r border-border-light px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                Description
              </div>
              <div className="flex-1 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                Result of Description
              </div>
            </div>
            <FieldRow label="FM Module" value={inst.fmModule} />
            <FieldRow label="Device GSM Number" value={inst.gsmNo} mono />
            <FieldRow label="Device GSM (Alt)" value={inst.gsmNoAlt} mono />
            <FieldRow label="Vehicle Information" value={inst.vehicleDescription} />
            <FieldRow label="Vehicle's Colour" value={inst.colour} />
            <FieldRow label="Cut OFF" value={inst.cutOff} />
            <FieldRow label="Engine Number" value={inst.engineNo} mono />
            <FieldRow label="Chassis Number" value={inst.chassisNo} mono />
          </div>
        </section>
      </div>

      {/* Money + pay */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          <Money label="Total" value={inst.totalAmount} />
          <Money label="Discount" value={inst.discount} />
          <Money label="Paid" value={inst.amountPaid} />
          <Money label="Remaining" value={remaining(inst)} accent={owed > 0} />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Payment Method
            </p>
            <p className="mt-0.5 text-[14px] font-medium text-text-primary">
              {inst.accountName ?? "—"}
            </p>
          </div>
        </div>

        {owed > 0 && (
          <button
            type="button"
            onClick={onPay}
            className="flex h-9 flex-none items-center gap-2 rounded-[9px] bg-accent px-4 text-[13px] font-semibold text-accent-foreground transition-opacity hover:opacity-90"
            style={{ boxShadow: "0 1px 2px rgba(225,29,72,0.20), 0 4px 12px -4px rgba(225,29,72,0.40)" }}
          >
            <Wallet className="h-4 w-4" />
            Pay remaining {fmtRupees(remaining(inst))}
          </button>
        )}
      </div>

      {inst.fittedDevices.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Devices fitted
          </p>
          <div className="flex flex-col gap-1.5">
            {inst.fittedDevices.map((d, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-[13px] text-text-primary">
                  {d.name}
                  {d.quantity > 1 && (
                    <span className="ml-1.5 text-text-secondary">× {d.quantity}</span>
                  )}
                </span>
                <span className="font-mono text-[13px] text-text-secondary">
                  {fmtRupees(String(parseFloat(d.unitPrice) * d.quantity))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Money({ label, value, accent }: { label: string; value: string | null; accent?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{label}</p>
      <p className={`mt-0.5 text-[14px] font-semibold ${accent ? "text-error" : "text-text-primary"}`}>
        {fmtRupees(value)}
      </p>
    </div>
  );
}

/* ─── Empty state ──────────────────────────────────────── */

function EmptyState({
  filter,
  query,
  onAdd,
}: {
  filter: Filter;
  query: string;
  onAdd: () => void;
}) {
  // A search that found nothing is far more likely than an empty module
  const searching = query !== "";

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-accent-light">
        {searching ? (
          <Search className="h-7 w-7 text-accent" />
        ) : (
          <HardDrive className="h-7 w-7 text-accent" />
        )}
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold text-text-primary">
          {searching
            ? "Nothing matched that search"
            : filter === "all"
              ? "No installations yet"
              : `No ${filter} installations`}
        </p>
        <p className="mt-1 text-[13px] text-text-secondary">
          {searching
            ? "Check the registration number or IMEI, or clear the search."
            : filter === "all"
              ? "Record your first device installation to get started."
              : "Change the filter to see other installations."}
        </p>
      </div>
      {filter === "all" && !searching && (
        <button
          onClick={onAdd}
          className="flex h-9 items-center gap-2 rounded-[9px] bg-accent px-4 text-[13px] font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          style={{
            boxShadow: "0 1px 2px rgba(225,29,72,0.20), 0 4px 12px -4px rgba(225,29,72,0.40)",
          }}
        >
          <Plus className="h-4 w-4" />
          New installation
        </button>
      )}
    </div>
  );
}
