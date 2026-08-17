"use client";

import { Fragment, useState } from "react";
import { ChevronDown, HardDrive, Plus, Upload } from "lucide-react";
import {
  NewInstallationModal,
  type CustomerOption,
} from "@/components/installations/NewInstallationModal";
import { ImportCsvModal } from "@/components/installations/ImportCsvModal";
import type { AccountOption } from "@/lib/accounts";
import type { InstallableDevice } from "@/lib/device-options";


export type InstallationRow = {
  id: string;
  customerName: string;
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

type Props = {
  installations: InstallationRow[];
  customers: CustomerOption[];
  accounts: AccountOption[];
  devices: InstallableDevice[];
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

type Filter = "all" | "active" | "suspended";

/* ─── Main view ────────────────────────────────────────── */

export function InstallationsView({ installations, customers, accounts, devices }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = installations.filter((i) => {
    if (filter === "active") return i.status !== "suspended";
    if (filter === "suspended") return i.status === "suspended";
    return true;
  });

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

      {/* Toolbar */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center rounded-[9px] border border-border bg-surface p-1">
          {(["all", "active", "suspended"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-[7px] px-3.5 py-1.5 text-[13px] transition-colors ${
                filter === f
                  ? "bg-text-primary font-semibold text-white"
                  : "font-medium text-text-secondary hover:text-text-primary"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
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

      {/* Table card */}
      <div
        className="rounded-[20px] border border-border bg-surface"
        style={{
          boxShadow: "0 1px 2px rgba(26,20,20,0.05), 0 6px 22px -8px rgba(26,20,20,0.14)",
        }}
      >
        {filtered.length === 0 ? (
          <EmptyState filter={filter} onAdd={() => setModalOpen(true)} />
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
              {filtered.map((inst, i) => (
                <Fragment key={inst.id}>
                  <tr
                    onClick={() => setExpandedId(expandedId === inst.id ? null : inst.id)}
                    className={`cursor-pointer transition-colors hover:bg-surface-muted ${
                      i < filtered.length - 1 || expandedId === inst.id ? "border-b border-border" : ""
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
                        <DetailPanel inst={inst} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

/* ─── Detail panel ─────────────────────────────────────── */

function DetailPanel({ inst }: { inst: InstallationRow }) {
  return (
    <div
      className="rounded-[14px] border border-border bg-surface p-5"
      style={{ boxShadow: "0 1px 2px rgba(26,20,20,0.05), 0 4px 12px -4px rgba(26,20,20,0.10)" }}
    >
      {/* Panel header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-[15px] font-semibold text-text-primary">
            {inst.registrationNo} · {inst.customerName}
          </p>
          <p className="mt-0.5 text-[13px] text-text-secondary">
            {inst.vehicleDescription} · Installed {fmtDateFull(inst.installationDate)}
          </p>
        </div>
        <StatusPill status={inst.status} isRenewalDue={inst.isRenewalDue} />
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-3 gap-x-8 gap-y-4">
        <DetailField label="IMEI" value={inst.imeiNo} mono />
        <DetailField label="GSM Number" value={inst.gsmNo} mono />
        <DetailField label="FM Module" value={inst.fmModule} />
        <DetailField label="Engine No" value={inst.engineNo} mono />
        <DetailField label="Chassis No" value={inst.chassisNo} mono />
        <DetailField label="Colour" value={inst.colour} />
        <DetailField label="Cut Off" value={inst.cutOff} />
        <DetailField label="Next Renewal" value={fmtDateFull(inst.nextRenewalDate)} />
        <DetailField label="Payment Method" value={inst.accountName} />
        <DetailField label="Discount" value={fmtRupees(inst.discount)} />
        <DetailField label="Paid" value={fmtRupees(inst.amountPaid)} />
        <DetailField label="Remaining" value={fmtRupees(remaining(inst))} />
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

      {inst.gsmNoAlt && (
        <div className="mt-4 border-t border-border pt-4">
          <DetailField label="GSM No (Alt)" value={inst.gsmNoAlt} mono />
        </div>
      )}
    </div>
  );
}

function DetailField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        {label}
      </p>
      <p
        className={`mt-0.5 text-[14px] font-medium text-text-primary ${
          mono ? "font-mono" : ""
        }`}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}

/* ─── Empty state ──────────────────────────────────────── */

function EmptyState({ filter, onAdd }: { filter: Filter; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-accent-light">
        <HardDrive className="h-7 w-7 text-accent" />
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold text-text-primary">
          {filter === "all" ? "No installations yet" : `No ${filter} installations`}
        </p>
        <p className="mt-1 text-[13px] text-text-secondary">
          {filter === "all"
            ? "Record your first device installation to get started."
            : "Change the filter to see other installations."}
        </p>
      </div>
      {filter === "all" && (
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
