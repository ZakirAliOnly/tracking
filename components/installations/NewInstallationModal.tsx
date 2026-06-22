"use client";

import { useActionState, useEffect, useState } from "react";
import { ChevronDown, Plus, Trash2, X } from "lucide-react";
import { createInstallations, type InstallationActionState } from "@/actions/installations";

export type CustomerOption = { id: string; name: string };
export type AccountOption = { id: string; name: string };
export type StockDeviceOption = {
  id: string;
  label: string;
  imeiNo: string | null;
  gsmNo: string | null;
  salePrice: string | null;
  quantity: number;
};

type DeviceRow = {
  _key: string;
  deviceId: string;
  imeiNo: string;
  gsmNo: string;
  registrationNo: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColour: string;
  salePrice: string;
};

function makeRow(): DeviceRow {
  return {
    _key: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    deviceId: "",
    imeiNo: "",
    gsmNo: "",
    registrationNo: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleColour: "",
    salePrice: "",
  };
}

function addOneYear(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

function fmtRs(v: number) {
  return `Rs ${Math.round(v).toLocaleString("en-PK")}`;
}

const INPUT =
  "h-10 rounded-[9px] border border-border bg-surface px-3 text-[13px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors";
const SELECT = INPUT + " w-full appearance-none pl-3 pr-8";

type Props = {
  open: boolean;
  onClose: () => void;
  customers: CustomerOption[];
  accounts: AccountOption[];
  deviceOptions: StockDeviceOption[];
};

export function NewInstallationModal({ open, onClose, customers, accounts, deviceOptions }: Props) {
  const [state, formAction, isPending] = useActionState<InstallationActionState, FormData>(
    createInstallations,
    null
  );
  const todayStr = () => new Date().toISOString().slice(0, 10);

  const [deviceRows, setDeviceRows] = useState<DeviceRow[]>([makeRow()]);
  const [formKey, setFormKey] = useState(0);
  const [installDate, setInstallDate] = useState(todayStr());
  const [renewalDate, setRenewalDate] = useState(addOneYear(todayStr()));
  const [discount, setDiscount] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);

  const totalPrice = deviceRows.reduce((sum, r) => sum + (parseFloat(r.salePrice) || 0), 0);
  const netTotal = Math.max(0, totalPrice - discount);
  const remaining = Math.max(0, netTotal - amountPaid);

  function reset() {
    setDeviceRows([makeRow()]);
    setInstallDate(new Date().toISOString().slice(0, 10));
    setRenewalDate(addOneYear(new Date().toISOString().slice(0, 10)));
    setDiscount(0);
    setAmountPaid(0);
  }

  useEffect(() => {
    if (state?.success) { onClose(); setFormKey((k) => k + 1); reset(); }
  }, [state?.success, onClose]);

  useEffect(() => {
    if (!open) { setFormKey((k) => k + 1); reset(); }
  }, [open]);

  const handleInstallDateChange = (v: string) => {
    setInstallDate(v);
    if (!renewalDate) setRenewalDate(addOneYear(v));
  };

  const updateRow = (idx: number, field: keyof Omit<DeviceRow, "_key">, value: string) => {
    setDeviceRows((rows) => rows.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const selectDevice = (idx: number, deviceId: string) => {
    const dev = deviceOptions.find((d) => d.id === deviceId);
    setDeviceRows((rows) =>
      rows.map((r, i) =>
        i === idx
          ? { ...r, deviceId, salePrice: dev?.salePrice ?? "", imeiNo: dev?.imeiNo ?? "", gsmNo: dev?.gsmNo ?? "" }
          : r
      )
    );
  };

  const removeRow = (idx: number) => setDeviceRows((rows) => rows.filter((_, i) => i !== idx));
  const addRow = () => setDeviceRows((rows) => [...rows, makeRow()]);

  if (!open) return null;

  const devicesPayload = deviceRows.map(({ _key: _k, ...r }) => r);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-overlay/40" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="flex w-full max-w-[700px] max-h-[92vh] flex-col rounded-[20px] bg-surface shadow-2xl"
          style={{ boxShadow: "0 20px 60px -12px rgba(15,27,45,0.25)" }}
        >
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-5">
            <div>
              <h2 className="font-display text-[17px] font-semibold text-text-primary">New installation</h2>
              <p className="mt-0.5 text-[13px] text-text-secondary">
                Select customer, vehicle details, and device from stock
              </p>
            </div>
            <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-[9px] text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form */}
          <form key={formKey} action={formAction} className="flex flex-1 flex-col overflow-y-auto">
            <input type="hidden" name="devices" value={JSON.stringify(devicesPayload)} />
            <input type="hidden" name="discount" value={String(discount)} />
            <input type="hidden" name="amountPaid" value={String(amountPaid)} />

            <div className="flex flex-col gap-5 px-6 pb-4 pt-5">
              {state?.error && !state.success && (
                <div className="rounded-[9px] bg-error-light px-4 py-3">
                  <p className="text-[13px] font-medium text-error-foreground">{state.error}</p>
                </div>
              )}

              {/* Customer */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-text-primary">
                  Customer <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <select name="customerId" required defaultValue="" className={SELECT}>
                    <option value="" disabled>Select customer…</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                </div>
              </div>

              {/* Dates — install date is always today (hidden), renewal is optional */}
              <input type="hidden" name="installationDate" value={installDate} />
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-text-primary">Next renewal date</label>
                <input
                  name="nextRenewalDate" type="date" value={renewalDate}
                  onChange={(e) => setRenewalDate(e.target.value)}
                  className={INPUT + " max-w-[200px]"}
                />
                <p className="text-[12px] text-text-muted">Leave as-is to default to 1 year from today</p>
              </div>

              <div className="border-t border-border" />

              {/* Device rows */}
              {deviceRows.map((row, idx) => (
                <DeviceCard
                  key={row._key}
                  row={row}
                  idx={idx}
                  deviceOptions={deviceOptions}
                  canRemove={deviceRows.length > 1}
                  onUpdate={(field, value) => updateRow(idx, field, value)}
                  onSelectDevice={(id) => selectDevice(idx, id)}
                  onRemove={() => removeRow(idx)}
                />
              ))}

              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-2 self-start text-[13px] font-semibold text-accent transition-opacity hover:opacity-75"
              >
                <Plus className="h-4 w-4" />
                Add another device
              </button>

              <div className="border-t border-border" />

              {/* Discount + Amount paid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-text-primary">Discount</label>
                  <input
                    type="number" min="0" step="any" placeholder="0"
                    onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                    className={INPUT}
                  />
                  <p className="text-[12px] text-text-muted">Applied to the total order</p>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-text-primary">Amount paid now</label>
                  <input
                    type="number" min="0" step="any" placeholder="0"
                    onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                    className={INPUT}
                  />
                  <p className="text-[12px] text-text-muted">Upfront payment received</p>
                </div>
              </div>

              {/* Payment method */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-text-primary">Payment method</label>
                <div className="relative w-1/2">
                  <select name="accountId" defaultValue="" className={SELECT}>
                    <option value="">None</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                </div>
              </div>

              {/* Summary */}
              {totalPrice > 0 && (
                <div className="rounded-[12px] border border-border bg-surface-muted px-4 py-4">
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    Order Summary
                  </p>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-text-secondary">
                        {deviceRows.length} device{deviceRows.length > 1 ? "s" : ""}
                      </span>
                      <span className="text-[13px] font-medium text-text-primary">{fmtRs(totalPrice)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-text-secondary">Discount</span>
                        <span className="text-[13px] font-medium text-success-foreground">− {fmtRs(discount)}</span>
                      </div>
                    )}
                    {discount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-medium text-text-primary">Net total</span>
                        <span className="text-[13px] font-semibold text-text-primary">{fmtRs(netTotal)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-text-secondary">Paid now</span>
                      <span className="text-[13px] font-medium text-success-foreground">{fmtRs(amountPaid)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between border-t border-border pt-2">
                      <span className="text-[13px] font-semibold text-text-primary">Remaining</span>
                      <span className={`text-[15px] font-bold ${remaining > 0 ? "text-error" : "text-success-foreground"}`}>
                        {remaining > 0 ? fmtRs(remaining) : "Fully paid"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-shrink-0 gap-3 border-t border-border px-6 py-5">
              <button type="button" onClick={onClose} className="flex-1 h-10 rounded-[9px] border border-border bg-surface text-[14px] font-medium text-text-secondary transition-colors hover:text-text-primary">
                Cancel
              </button>
              <button
                type="submit" disabled={isPending}
                className="flex-1 h-10 rounded-[9px] bg-accent text-[14px] font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ boxShadow: "0 1px 2px rgba(45,107,255,0.20), 0 4px 12px -4px rgba(45,107,255,0.40)" }}
              >
                {isPending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                {isPending ? "Saving…" : `Save ${deviceRows.length} installation${deviceRows.length > 1 ? "s" : ""}`}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

/* ─── Device row card ─────────────────────────────────────────── */

type DeviceCardProps = {
  row: DeviceRow;
  idx: number;
  deviceOptions: StockDeviceOption[];
  canRemove: boolean;
  onUpdate: (field: keyof Omit<DeviceRow, "_key">, value: string) => void;
  onSelectDevice: (id: string) => void;
  onRemove: () => void;
};

function DeviceCard({ row, idx, deviceOptions, canRemove, onUpdate, onSelectDevice, onRemove }: DeviceCardProps) {
  const selectedDevice = deviceOptions.find((d) => d.id === row.deviceId) ?? null;

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-border bg-background p-4">
      {/* Card header */}
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-text-primary">Device #{idx + 1}</span>
        {canRemove && (
          <button type="button" onClick={onRemove} className="flex h-7 w-7 items-center justify-center rounded-[7px] text-text-muted transition-colors hover:bg-error-light hover:text-error">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Device select */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium text-text-muted uppercase tracking-wider">
          Device from stock <span className="text-error">*</span>
        </label>
        <div className="relative">
          <select
            value={row.deviceId}
            onChange={(e) => onSelectDevice(e.target.value)}
            className="h-10 w-full appearance-none rounded-[9px] border border-border bg-surface pl-3 pr-8 text-[13px] text-text-primary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors"
            required
          >
            <option value="">Select device…</option>
            {deviceOptions.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}{d.imeiNo ? ` · ${d.imeiNo}` : ""} (×{d.quantity} in stock)
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        </div>
      </div>

      {/* IMEI + GSM — shown once a device is selected */}
      {row.deviceId && (
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-text-muted uppercase tracking-wider">
              IMEI No <span className="text-error">*</span>
            </label>
            <input
              placeholder="IMEI of this unit"
              value={row.imeiNo}
              onChange={(e) => onUpdate("imeiNo", e.target.value)}
              required
              className="h-10 w-full rounded-[9px] border border-accent/40 bg-accent-light/30 px-3 font-mono text-[13px] text-text-primary placeholder:font-sans placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-text-muted uppercase tracking-wider">
              GSM No
            </label>
            <input
              placeholder="SIM / GSM number"
              value={row.gsmNo}
              onChange={(e) => onUpdate("gsmNo", e.target.value)}
              className="h-10 w-full rounded-[9px] border border-accent/40 bg-accent-light/30 px-3 font-mono text-[13px] text-text-primary placeholder:font-sans placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors"
            />
          </div>
        </div>
      )}

      {/* Vehicle fields */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium text-text-muted uppercase tracking-wider">Vehicle</label>
        <div className="grid grid-cols-4 gap-2.5">
          <input
            placeholder="Reg No *"
            value={row.registrationNo}
            onChange={(e) => onUpdate("registrationNo", e.target.value)}
            required
            className="h-10 col-span-1 rounded-[9px] border border-border bg-surface px-3 text-[13px] font-mono text-text-primary placeholder:font-sans placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors"
          />
          <input
            placeholder="Make"
            value={row.vehicleMake}
            onChange={(e) => onUpdate("vehicleMake", e.target.value)}
            className="h-10 rounded-[9px] border border-border bg-surface px-3 text-[13px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors"
          />
          <input
            placeholder="Model"
            value={row.vehicleModel}
            onChange={(e) => onUpdate("vehicleModel", e.target.value)}
            className="h-10 rounded-[9px] border border-border bg-surface px-3 text-[13px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors"
          />
          <input
            placeholder="Color"
            value={row.vehicleColour}
            onChange={(e) => onUpdate("vehicleColour", e.target.value)}
            className="h-10 rounded-[9px] border border-border bg-surface px-3 text-[13px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors"
          />
        </div>
      </div>

      {/* Sale price */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium text-text-muted uppercase tracking-wider">Sale price</label>
        <input
          type="number" min="0" step="any" placeholder="0"
          value={row.salePrice}
          onChange={(e) => onUpdate("salePrice", e.target.value)}
          className="h-10 w-40 rounded-[9px] border border-border bg-surface px-3 text-[13px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors"
        />
        {selectedDevice?.salePrice && row.salePrice !== selectedDevice.salePrice && (
          <p className="text-[12px] text-text-muted">
            Default: {`Rs ${Math.round(parseFloat(selectedDevice.salePrice)).toLocaleString("en-PK")}`}
          </p>
        )}
      </div>
    </div>
  );
}
