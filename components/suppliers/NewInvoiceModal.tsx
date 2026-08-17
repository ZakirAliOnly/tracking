"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { createPurchaseInvoice, type SupplierActionState } from "@/actions/suppliers";
import { useActionToast } from "@/components/ui/ToastProvider";
import { SubmitButton } from "@/components/ui/SubmitButton";

export type SupplierOption = { id: string; name: string };
export type AccountOption = { id: string; name: string };
export type DeviceOption = {
  id: string;
  name: string;
  costPrice: string | null;
  salePrice: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  suppliers: SupplierOption[];
  devices: DeviceOption[];
  accounts: AccountOption[];
  prefilledSupplierId?: string | null;
};

const INPUT =
  "h-10 rounded-[9px] border border-border bg-surface px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors";
const SELECT = INPUT + " w-full appearance-none pl-3 pr-8";

const today = () => new Date().toISOString().slice(0, 10);

function fmtRs(v: number) {
  return `Rs ${Math.round(v).toLocaleString("en-PK")}`;
}

export function NewInvoiceModal({ open, onClose, suppliers, devices, accounts, prefilledSupplierId }: Props) {
  const [state, formAction] = useActionState<SupplierActionState, FormData>(
    createPurchaseInvoice,
    null
  );

  useActionToast(state?.error);

  const [formKey, setFormKey] = useState(0);
  const [selectedDevice, setSelectedDevice] = useState<DeviceOption | null>(null);
  const [qty, setQty] = useState(0);
  const [cost, setCost] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const firstRef = useRef<HTMLSelectElement>(null);

  const total = qty * cost;
  const remaining = total - amountPaid;

  const resetSummary = () => {
    setQty(0);
    setCost(0);
    setAmountPaid(0);
    setSelectedDevice(null);
  };

  useEffect(() => {
    if (state?.success) { onClose(); setFormKey((k) => k + 1); resetSummary(); }
  }, [state?.success, onClose]);

  useEffect(() => {
    if (!open) { setFormKey((k) => k + 1); resetSummary(); }
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => firstRef.current?.focus(), 50);
  }, [open]);

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dev = devices.find((d) => d.id === e.target.value) ?? null;
    setSelectedDevice(dev);
    if (dev?.costPrice) setCost(parseFloat(dev.costPrice));
    else setCost(0);
  };

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-overlay/40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="flex w-full max-w-[460px] max-h-[92vh] flex-col rounded-[20px] bg-surface"
          style={{ boxShadow: "0 20px 60px -12px rgba(26,20,20,0.25)" }}
        >
          <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-5">
            <div>
              <h2 className="font-display text-[17px] font-semibold text-text-primary">New purchase invoice</h2>
              <p className="mt-0.5 text-[13px] text-text-secondary">Record stock received from a supplier</p>
            </div>
            <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-[9px] text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form key={formKey} action={formAction} className="flex flex-1 flex-col overflow-y-auto">
            <div className="flex flex-col gap-4 px-6 py-6">
            {/* Supplier */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">Supplier <span className="text-error">*</span></label>
              <div className="relative">
                <select ref={firstRef} name="supplierId" defaultValue={prefilledSupplierId ?? ""} className={SELECT} required>
                  <option value="">Select supplier</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              </div>
            </div>

            {/* Device */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">Device <span className="text-error">*</span></label>
              <div className="relative">
                <select name="deviceId" defaultValue="" onChange={handleDeviceChange} className={SELECT} required>
                  <option value="">Select device</option>
                  {devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              </div>
            </div>

            {/* Quantity */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">Quantity <span className="text-error">*</span></label>
              <input
                name="quantity" type="number" min="1" step="1" placeholder="1" required
                onChange={(e) => setQty(parseInt(e.target.value, 10) || 0)}
                className={INPUT}
              />
            </div>

            <div className="border-t border-border" />

            {/* Prices */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-text-primary">Cost price <span className="text-error">*</span></label>
                <input
                  name="costPrice" type="number" min="0" step="any" placeholder="0" required
                  defaultValue={selectedDevice?.costPrice ?? ""}
                  key={`cost-${selectedDevice?.id ?? "none"}`}
                  onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
                  className={INPUT}
                />
                <p className="text-[12px] text-text-muted">Per unit</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-text-primary">Sale price</label>
                <input
                  name="salePrice" type="number" min="0" step="any" placeholder="0"
                  defaultValue={selectedDevice?.salePrice ?? ""}
                  key={`sale-${selectedDevice?.id ?? "none"}`}
                  className={INPUT}
                />
                <p className="text-[12px] text-text-muted">Per unit</p>
              </div>
            </div>

            {/* Amount paid now */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">Amount paid now</label>
              <input
                name="amountPaid" type="number" min="0" step="any" placeholder="0"
                onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                className={INPUT}
              />
              <p className="text-[12px] text-text-muted">How much you paid upfront at the time of purchase</p>
            </div>

            {/* Payment method */}
            {accounts.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-text-primary">
                  Paid from account {amountPaid > 0 && <span className="text-error">*</span>}
                </label>
                <div className="relative">
                  <select name="accountId" defaultValue="" required={amountPaid > 0} className={SELECT}>
                    <option value="">Select payment method</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                </div>
                <p className="text-[12px] text-text-muted">
                  {amountPaid > 0
                    ? "The amount paid now is deducted from this method"
                    : "Only used once you enter an amount paid now"}
                </p>
              </div>
            )}

            {/* Live summary */}
            {total > 0 && (
              <div className="rounded-[12px] border border-border bg-surface-muted px-4 py-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">Order Summary</p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-text-secondary">
                      {qty} {qty === 1 ? "unit" : "units"} × {fmtRs(cost)}
                    </span>
                    <span className="text-[13px] font-medium text-text-primary">{fmtRs(total)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-text-secondary">Paid now</span>
                    <span className="text-[13px] font-medium text-success-foreground">{fmtRs(amountPaid)}</span>
                  </div>
                  <div className="mt-1 border-t border-border pt-2 flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-text-primary">Remaining</span>
                    <span className={`text-[15px] font-bold ${remaining > 0 ? "text-error" : "text-success-foreground"}`}>
                      {remaining > 0 ? fmtRs(remaining) : "Fully paid"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Invoice date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">Invoice date <span className="text-error">*</span></label>
              <input name="invoiceDate" type="date" required defaultValue={today()} className={INPUT} />
            </div>

            {/* Notes */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">Notes</label>
              <input name="notes" type="text" placeholder="Optional reference or note" className={INPUT} />
            </div>

            </div>

            <div className="mt-auto flex flex-shrink-0 gap-3 border-t border-border px-6 py-5">
              <button type="button" onClick={onClose} className="h-10 flex-1 rounded-[9px] border border-border bg-surface text-[14px] font-medium text-text-secondary transition-colors hover:text-text-primary">
                Cancel
              </button>
              <SubmitButton
                pendingLabel="Saving…"
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[9px] bg-accent text-[14px] font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ boxShadow: "0 1px 2px rgba(225,29,72,0.20), 0 4px 12px -4px rgba(225,29,72,0.40)" }}
              >
                Create invoice
              </SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
