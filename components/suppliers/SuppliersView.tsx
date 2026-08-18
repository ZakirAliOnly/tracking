"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Truck, Package, CircleDollarSign, Pencil, Trash2, BookOpen, Printer } from "lucide-react";
import { AddSupplierModal, type SupplierEditTarget } from "./AddSupplierModal";
import { NewInvoiceModal, type SupplierOption, type DeviceOption } from "./NewInvoiceModal";
import { PaySupplierModal, type AccountOption, type PayTarget } from "./PaySupplierModal";
import { SupplierLedgerModal } from "./SupplierLedgerModal";
import { deleteSupplier } from "@/actions/suppliers";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Pagination } from "@/components/ui/Pagination";
import { buildHref } from "@/lib/pagination";

export type SupplierRow = {
  id: string;
  name: string;
  phone: string | null;
  contactName: string | null;
  address: string | null;
  openingOwed: string;
  estPayable: string;
  supplies: string | null;
};

export type InvoiceRow = {
  id: string;
  supplierName: string;
  deviceName: string | null;
  quantity: number;
  costPrice: string;
  salePrice: string | null;
  totalAmount: string;
  amountPaid: string;
  invoiceDate: string;
  notes: string | null;
};

export type SupplierStats = {
  totalSuppliers: number;
  itemsSupplied: number;
  totalPayable: number;
};

type Tab = "suppliers" | "invoices";

type Props = {
  suppliers: SupplierRow[];
  invoices: InvoiceRow[];
  stats: SupplierStats;
  accounts: AccountOption[];
  supplierOptions: SupplierOption[];
  deviceOptions: DeviceOption[];
  tab: Tab;
  supplierPage: number;
  supplierTotal: number;
  invoicePage: number;
  invoiceTotal: number;
  searchParams: Record<string, string | undefined>;
};

function fmtRs(v: number | string | null) {
  const n = typeof v === "string" ? parseFloat(v) : (v ?? 0);
  if (!n || n === 0) return "—";
  return `Rs ${Math.round(n).toLocaleString("en-PK")}`;
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div
      className="flex items-center gap-4 rounded-[16px] border border-border bg-surface px-5 py-4"
      style={{ boxShadow: "0 1px 2px rgba(26,20,20,0.05), 0 4px 16px -8px rgba(26,20,20,0.10)" }}
    >
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[12px] bg-accent-light">
        <Icon className="h-5 w-5 text-accent" />
      </div>
      <div>
        <p className="text-[12px] font-medium text-text-secondary">{label}</p>
        <p className={`font-display text-[22px] font-bold leading-7 ${accent ?? "text-text-primary"}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function CountBadge({ count }: { count: number }) {
  return (
    <span className="ml-1.5 rounded-full bg-surface-tertiary px-2 py-0.5 text-[11px] font-semibold text-text-muted">
      {count}
    </span>
  );
}

export function SuppliersView({
  suppliers,
  invoices,
  stats,
  accounts,
  supplierOptions,
  deviceOptions,
  tab,
  supplierPage,
  supplierTotal,
  invoicePage,
  invoiceTotal,
  searchParams,
}: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<SupplierEditTarget | null>(null);
  const [payTarget, setPayTarget] = useState<PayTarget | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoicePrefilledId, setInvoicePrefilledId] = useState<string | null>(null);
  const [ledgerTarget, setLedgerTarget] = useState<{ id: string; name: string } | null>(null);

  const openInvoice = (supplierId: string | null = null) => {
    setInvoicePrefilledId(supplierId);
    setInvoiceOpen(true);
  };

  const closeInvoice = () => {
    setInvoiceOpen(false);
    setInvoicePrefilledId(null);
  };

  return (
    <>
      <AddSupplierModal
        open={addOpen || !!editTarget}
        onClose={() => {
          setAddOpen(false);
          setEditTarget(null);
        }}
        editTarget={editTarget}
      />

      <NewInvoiceModal
        open={invoiceOpen}
        onClose={closeInvoice}
        suppliers={supplierOptions}
        devices={deviceOptions}
        accounts={accounts}
        prefilledSupplierId={invoicePrefilledId}
      />

      <PaySupplierModal
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        target={payTarget}
        accounts={accounts}
      />

      <SupplierLedgerModal
        open={!!ledgerTarget}
        onClose={() => setLedgerTarget(null)}
        supplierId={ledgerTarget?.id ?? null}
        supplierName={ledgerTarget?.name ?? null}
      />

      {/* Tabs */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center rounded-[9px] border border-border bg-surface p-1">
          {(["suppliers", "invoices"] as Tab[]).map((t) => (
            <Link
              key={t}
              // Switching tabs never touches either table's own page number —
              // each is paginated independently
              href={buildHref("/suppliers", searchParams, { tab: t === "suppliers" ? undefined : t, page: undefined })}
              className={`rounded-[7px] px-3.5 py-1.5 text-[13px] transition-colors ${
                tab === t
                  ? "bg-text-primary font-semibold text-white"
                  : "font-medium text-text-secondary hover:text-text-primary"
              }`}
            >
              {t === "suppliers" ? "Suppliers" : "Purchase Invoices"}
              <CountBadge count={t === "suppliers" ? supplierTotal : invoiceTotal} />
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {tab === "invoices" && (
            <button
              onClick={() => openInvoice(null)}
              className="flex h-9 items-center gap-2 rounded-[9px] border border-border bg-surface px-4 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
            >
              <Plus className="h-4 w-4" />
              New invoice
            </button>
          )}
          <button
            onClick={() => setAddOpen(true)}
            className="flex h-9 items-center gap-2 rounded-[9px] bg-accent px-4 text-[13px] font-semibold text-accent-foreground transition-opacity hover:opacity-90"
            style={{ boxShadow: "0 1px 2px rgba(225,29,72,0.20), 0 4px 12px -4px rgba(225,29,72,0.40)" }}
          >
            <Plus className="h-4 w-4" />
            Add supplier
          </button>
        </div>
      </div>

      {/* Stats — only on suppliers tab */}
      {tab === "suppliers" && (
        <div className="mb-5 grid grid-cols-3 gap-4">
          <StatCard
            icon={Truck}
            label="Total suppliers"
            value={String(stats.totalSuppliers)}
          />
          <StatCard
            icon={Package}
            label="Items supplied"
            value={String(stats.itemsSupplied)}
          />
          <StatCard
            icon={CircleDollarSign}
            label="Total payable"
            value={stats.totalPayable > 0 ? fmtRs(stats.totalPayable) : "Rs 0"}
            accent={stats.totalPayable > 0 ? "text-error" : undefined}
          />
        </div>
      )}

      {/* Table */}
      <div
        className="rounded-[20px] border border-border bg-surface"
        style={{ boxShadow: "0 1px 2px rgba(26,20,20,0.05), 0 6px 22px -8px rgba(26,20,20,0.14)" }}
      >
        {tab === "suppliers" ? (
          <SuppliersTable
            rows={suppliers}
            page={supplierPage}
            total={supplierTotal}
            searchParams={searchParams}
            onEdit={(s) =>
              setEditTarget({
                id: s.id,
                name: s.name,
                phone: s.phone,
                contactName: s.contactName,
                address: s.address,
                openingOwed: s.openingOwed,
                supplies: s.supplies,
              })
            }
            onPay={(s) =>
              setPayTarget({ id: s.id, name: s.name, estPayable: s.estPayable })
            }
            onInvoice={(s) => openInvoice(s.id)}
            onLedger={(s) => setLedgerTarget({ id: s.id, name: s.name })}
          />
        ) : (
          <InvoicesTable
            rows={invoices}
            page={invoicePage}
            total={invoiceTotal}
            searchParams={searchParams}
            onNewInvoice={() => openInvoice(null)}
          />
        )}
      </div>
    </>
  );
}

/* ─── Suppliers table ─────────────────────────────────────────── */

function SuppliersTable({
  rows,
  page,
  total,
  searchParams,
  onEdit,
  onPay,
  onInvoice,
  onLedger,
}: {
  rows: SupplierRow[];
  page: number;
  total: number;
  searchParams: Record<string, string | undefined>;
  onEdit: (s: SupplierRow) => void;
  onPay: (s: SupplierRow) => void;
  onInvoice: (s: SupplierRow) => void;
  onLedger: (s: SupplierRow) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-accent-light">
          <Truck className="h-7 w-7 text-accent" />
        </div>
        <div className="text-center">
          <p className="text-[15px] font-semibold text-text-primary">No suppliers yet</p>
          <p className="mt-1 text-[13px] text-text-secondary">Add your first supplier to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px]">
        <thead>
          <tr className="border-b border-border">
            {["Name", "Phone", "Opening owed", "Est. payable", "Address", "Ledger", "Pay supplier", "New invoice", "Actions"].map(
              (h) => (
                <th
                  key={h}
                  className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted first:pl-5"
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => {
            const payable = parseFloat(s.estPayable);
            return (
              <tr
                key={s.id}
                className={`transition-colors hover:bg-surface-muted ${
                  i < rows.length - 1 ? "border-b border-border" : ""
                }`}
              >
                {/* Name */}
                <td className="pl-5 pr-4 py-3.5">
                  <span className="text-[14px] font-semibold text-text-primary">{s.name}</span>
                  {s.contactName && (
                    <p className="text-[12px] text-text-muted">{s.contactName}</p>
                  )}
                </td>
                {/* Phone */}
                <td className="px-4 py-3.5">
                  <span className="text-[13px] text-text-secondary">{s.phone ?? "—"}</span>
                </td>
                {/* Opening owed */}
                <td className="px-4 py-3.5">
                  <span className="text-[13px] font-medium text-text-primary">
                    {parseFloat(s.openingOwed) > 0 ? fmtRs(s.openingOwed) : "—"}
                  </span>
                </td>
                {/* Est. payable */}
                <td className="px-4 py-3.5">
                  <span
                    className={`text-[13px] font-semibold ${
                      payable > 0 ? "text-error" : "text-text-muted"
                    }`}
                  >
                    {payable > 0 ? fmtRs(payable) : "—"}
                  </span>
                </td>
                {/* Address */}
                <td className="px-4 py-3.5">
                  <span className="text-[13px] text-text-secondary">{s.address ?? "—"}</span>
                </td>
                {/* Ledger */}
                <td className="px-4 py-3.5">
                  <button
                    onClick={() => onLedger(s)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-warning-light px-3 text-[12px] font-semibold text-warning-foreground transition-opacity hover:opacity-80"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Ledger
                  </button>
                </td>
                {/* Pay */}
                <td className="px-4 py-3.5">
                  <button
                    onClick={() => onPay(s)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-success-light px-3 text-[12px] font-semibold text-success-foreground transition-opacity hover:opacity-80"
                  >
                    Pay
                  </button>
                </td>
                {/* Invoice */}
                <td className="px-4 py-3.5">
                  <button
                    onClick={() => onInvoice(s)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-accent-light px-3 text-[12px] font-semibold text-accent transition-opacity hover:opacity-80"
                  >
                    Invoice
                  </button>
                </td>
                {/* Actions */}
                <td className="px-4 py-3.5 pr-5">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEdit(s)}
                      className="flex h-8 w-8 items-center justify-center rounded-[8px] text-text-muted transition-colors hover:bg-accent-light hover:text-accent"
                      aria-label="Edit supplier"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <form
                      action={async (fd: FormData) => { await deleteSupplier(null, fd); }}
                      onSubmit={(e) => {
                        if (!window.confirm(`Delete "${s.name}"? This cannot be undone.`))
                          e.preventDefault();
                      }}
                    >
                      <input type="hidden" name="id" value={s.id} />
                      <SubmitButton
                        pendingLabel=""
                        spinnerClassName="h-3.5 w-3.5"
                        className="flex h-8 w-8 items-center justify-center rounded-[8px] text-text-muted transition-colors hover:bg-error-light hover:text-error disabled:opacity-60"
                        aria-label="Delete supplier"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </SubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Pagination
        page={page}
        total={total}
        label="supplier"
        basePath="/suppliers"
        searchParams={searchParams}
        paramName="spage"
      />
    </div>
  );
}

/* ─── Invoices table ──────────────────────────────────────────── */

function InvoicesTable({
  rows,
  page,
  total,
  searchParams,
  onNewInvoice,
}: {
  rows: InvoiceRow[];
  page: number;
  total: number;
  searchParams: Record<string, string | undefined>;
  onNewInvoice: () => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-accent-light">
          <Package className="h-7 w-7 text-accent" />
        </div>
        <div className="text-center">
          <p className="text-[15px] font-semibold text-text-primary">No purchase invoices yet</p>
          <p className="mt-1 text-[13px] text-text-secondary">
            Record stock received from suppliers.
          </p>
        </div>
        <button
          onClick={onNewInvoice}
          className="flex h-9 items-center gap-2 rounded-[9px] bg-accent px-4 text-[13px] font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          style={{ boxShadow: "0 1px 2px rgba(225,29,72,0.20), 0 4px 12px -4px rgba(225,29,72,0.40)" }}
        >
          <Plus className="h-4 w-4" />
          New invoice
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px]">
        <thead>
          <tr className="border-b border-border">
            {["Supplier", "Device", "Qty", "Cost", "Total", "Paid", "Remaining", "Date", ""].map((h) => (
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
          {rows.map((inv, i) => {
            const total = parseFloat(inv.totalAmount);
            const paid = parseFloat(inv.amountPaid);
            const remaining = total - paid;
            return (
              <tr
                key={inv.id}
                className={`transition-colors hover:bg-surface-muted ${
                  i < rows.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <td className="pl-5 pr-4 py-3.5">
                  <span className="text-[13px] font-semibold text-text-primary">{inv.supplierName}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-[13px] text-text-secondary">{inv.deviceName ?? "—"}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-display text-[14px] font-bold text-text-primary">{inv.quantity}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-[13px] text-text-primary">{fmtRs(inv.costPrice)}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-[13px] font-semibold text-text-primary">{fmtRs(inv.totalAmount)}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-[13px] font-medium text-success-foreground">{paid > 0 ? fmtRs(paid) : "—"}</span>
                </td>
                <td className="px-4 py-3.5">
                  {remaining > 0 ? (
                    <span className="text-[13px] font-semibold text-error">{fmtRs(remaining)}</span>
                  ) : (
                    <span className="inline-flex h-5 items-center rounded-full bg-success-light px-2 text-[11px] font-semibold text-success-foreground">Paid</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-[12px] text-text-muted">{inv.invoiceDate}</span>
                </td>
                <td className="px-4 py-3.5 pr-5">
                  <button
                    onClick={() => window.open(`/print/invoice/${inv.id}`, "_blank")}
                    className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-border bg-surface px-3 text-[12px] font-medium text-text-secondary transition-colors hover:text-text-primary"
                    aria-label="Print invoice"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Print
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <Pagination
        page={page}
        total={total}
        label="invoice"
        basePath="/suppliers"
        searchParams={searchParams}
        paramName="ipage"
      />
    </div>
  );
}
