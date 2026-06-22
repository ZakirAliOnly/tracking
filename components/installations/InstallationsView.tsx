"use client";

import { Fragment, useState } from "react";
import { ChevronDown, HardDrive, Plus } from "lucide-react";
import {
  NewInstallationModal,
  type CustomerOption,
  type AccountOption,
  type StockDeviceOption,
} from "@/components/installations/NewInstallationModal";

export type { StockDeviceOption };

export type InstallationRow = {
  id: string;
  customerName: string;
  vehicleDescription: string;
  registrationNo: string;
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
  deviceOptions: StockDeviceOption[];
};

/* ─── Helpers ──────────────────────────────────────────── */

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #2D6BFF 0%, #5A8BFF 100%)",
  "linear-gradient(135deg, #13B981 0%, #34D399 100%)",
  "linear-gradient(135deg, #7C5CFC 0%, #A78BFA 100%)",
  "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)",
  "linear-gradient(135deg, #EF4D5A 0%, #F87171 100%)",
  "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)",
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

function truncateImei(imei: string): string {
  if (imei.length <= 8) return imei;
  return `${imei.slice(0, 4)}..${imei.slice(-4)}`;
}

function fmtRupees(amount: string | null): string {
  if (!amount) return "—";
  const n = Math.round(parseFloat(amount));
  return `Rs ${n.toLocaleString("en-PK")}`;
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

export function InstallationsView({ installations, customers, accounts, deviceOptions }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [modalOpen, setModalOpen] = useState(false);
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
        deviceOptions={deviceOptions}
      />

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

        <button
          onClick={() => setModalOpen(true)}
          className="flex h-9 items-center gap-2 rounded-[9px] bg-accent px-4 text-[13px] font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          style={{
            boxShadow: "0 1px 2px rgba(45,107,255,0.20), 0 4px 12px -4px rgba(45,107,255,0.40)",
          }}
        >
          <Plus className="h-4 w-4" />
          New installation
        </button>
      </div>

      {/* Table card */}
      <div
        className="rounded-[20px] border border-border bg-surface"
        style={{
          boxShadow: "0 1px 2px rgba(15,27,45,0.05), 0 6px 22px -8px rgba(15,27,45,0.14)",
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
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">IMEI</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">Install Date</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">Total</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">Account</th>
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
                        {inst.imeiNo ? truncateImei(inst.imeiNo) : "—"}
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

                    {/* Account */}
                    <td className="px-5 py-4">
                      {inst.accountName ? (
                        <span className="inline-flex items-center rounded-full bg-accent-light px-2.5 py-1 text-xs font-semibold text-accent">
                          {inst.accountName}
                        </span>
                      ) : (
                        <span className="text-[13px] text-text-muted">—</span>
                      )}
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
      style={{ boxShadow: "0 1px 2px rgba(15,27,45,0.05), 0 4px 12px -4px rgba(15,27,45,0.10)" }}
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
        <DetailField label="Account" value={inst.accountName} />
      </div>

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
            boxShadow: "0 1px 2px rgba(45,107,255,0.20), 0 4px 12px -4px rgba(45,107,255,0.40)",
          }}
        >
          <Plus className="h-4 w-4" />
          New installation
        </button>
      )}
    </div>
  );
}
