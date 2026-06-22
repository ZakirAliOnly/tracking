"use client";

import { useEffect, useState } from "react";
import { X, Truck } from "lucide-react";
import { fetchSupplierLedger, type LedgerData } from "@/actions/supplier-ledger";

type Props = {
  open: boolean;
  onClose: () => void;
  supplierId: string | null;
  supplierName: string | null;
};

function fmtRs(v: number) {
  return `Rs ${Math.round(v).toLocaleString("en-PK")}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function SupplierLedgerModal({ open, onClose, supplierId, supplierName }: Props) {
  const [data, setData] = useState<LedgerData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && supplierId) {
      setLoading(true);
      setData(null);
      fetchSupplierLedger(supplierId)
        .then(setData)
        .finally(() => setLoading(false));
    }
  }, [open, supplierId]);

  useEffect(() => {
    if (!open) setData(null);
  }, [open]);

  const balance = data?.finalBalance ?? 0;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-overlay/40 transition-opacity duration-300 ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[680px] flex-col bg-surface shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-border px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-accent-light">
            <Truck className="h-4 w-4 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-[17px] font-semibold text-text-primary truncate">
              {data?.supplierName ?? supplierName ?? "Ledger"}
            </h2>
            {data?.phone || data?.address ? (
              <p className="text-[12px] text-text-muted truncate">
                {[data.phone, data.address].filter(Boolean).join(" · ")}
              </p>
            ) : null}
          </div>

          {/* Balance pill */}
          {data && (
            <div
              className={`flex-shrink-0 rounded-[9px] px-3 py-1.5 ${
                balance > 0
                  ? "bg-error-light"
                  : balance < 0
                  ? "bg-success-light"
                  : "bg-surface-tertiary"
              }`}
            >
              <p className="text-[11px] font-medium text-text-muted">Balance</p>
              <p
                className={`text-[15px] font-bold leading-none ${
                  balance > 0
                    ? "text-error"
                    : balance < 0
                    ? "text-success-foreground"
                    : "text-text-muted"
                }`}
              >
                {balance === 0 ? "Settled" : fmtRs(Math.abs(balance))}
              </p>
            </div>
          )}

          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[9px] text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          )}

          {!loading && data && data.entries.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-20">
              <p className="text-[15px] font-semibold text-text-primary">No transactions yet</p>
              <p className="text-[13px] text-text-secondary">
                Add purchase invoices or payments to see the ledger.
              </p>
            </div>
          )}

          {!loading && data && data.entries.length > 0 && (
            <table className="w-full">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-border">
                  {["Date", "Description", "Debit", "Credit", "Balance"].map((h, i) => (
                    <th
                      key={h}
                      className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-text-muted ${
                        i === 0 ? "pl-5 text-left" : i < 2 ? "text-left" : "text-right last:pr-5"
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.entries.map((row, i) => (
                  <tr
                    key={i}
                    className={`transition-colors hover:bg-surface-muted ${
                      i < data.entries.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <td className="pl-5 pr-3 py-3">
                      <span className="text-[12px] text-text-muted whitespace-nowrap">{fmtDate(row.date)}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            row.type === "invoice"
                              ? "bg-accent-light text-accent"
                              : row.type === "payment"
                              ? "bg-success-light text-success-foreground"
                              : "bg-surface-tertiary text-text-muted"
                          }`}
                        >
                          {row.type === "invoice" ? "Invoice" : row.type === "payment" ? "Payment" : "Opening"}
                        </span>
                        <span className="text-[13px] text-text-primary truncate">{row.description}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {row.debit > 0 ? (
                        <span className="text-[13px] font-medium text-error">{fmtRs(row.debit)}</span>
                      ) : (
                        <span className="text-[13px] text-text-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {row.credit > 0 ? (
                        <span className="text-[13px] font-medium text-success-foreground">{fmtRs(row.credit)}</span>
                      ) : (
                        <span className="text-[13px] text-text-muted">—</span>
                      )}
                    </td>
                    <td className="py-3 pl-3 pr-5 text-right">
                      <span
                        className={`text-[13px] font-semibold ${
                          row.balance > 0
                            ? "text-error"
                            : row.balance < 0
                            ? "text-success-foreground"
                            : "text-text-muted"
                        }`}
                      >
                        {row.balance === 0 ? "—" : fmtRs(Math.abs(row.balance))}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer totals */}
        {data && data.entries.length > 0 && (
          <div className="flex-shrink-0 border-t border-border bg-surface-tertiary">
            <div className="grid grid-cols-5 px-0">
              <div className="col-span-2 px-5 py-3.5">
                <p className="text-[12px] font-medium text-text-muted">
                  {data.entries.length} {data.entries.length === 1 ? "entry" : "entries"}
                </p>
              </div>
              <div className="px-3 py-3.5 text-right">
                <p className="text-[12px] font-semibold text-error">{fmtRs(data.totalDebit)}</p>
              </div>
              <div className="px-3 py-3.5 text-right">
                <p className="text-[12px] font-semibold text-success-foreground">{fmtRs(data.totalCredit)}</p>
              </div>
              <div className="py-3.5 pl-3 pr-5 text-right">
                <p
                  className={`text-[12px] font-bold ${
                    balance > 0 ? "text-error" : balance < 0 ? "text-success-foreground" : "text-text-muted"
                  }`}
                >
                  {balance === 0 ? "Settled" : fmtRs(Math.abs(balance))}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
