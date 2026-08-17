"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { addDevice, type DeviceActionState } from "@/actions/devices";
import { useActionToast } from "@/components/ui/ToastProvider";
import { SubmitButton } from "@/components/ui/SubmitButton";

export type SupplierOption = { id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  suppliers: SupplierOption[];
};

const INPUT =
  "h-10 rounded-[9px] border border-border bg-surface px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors";

export function AddDeviceModal({ open, onClose, suppliers }: Props) {
  const [state, formAction] = useActionState<DeviceActionState, FormData>(
    addDevice,
    null
  );

  useActionToast(state?.error);

  const [formKey, setFormKey] = useState(0);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.success) {
      onClose();
      setFormKey((k) => k + 1);
    }
  }, [state?.success, onClose]);

  useEffect(() => {
    if (!open) setFormKey((k) => k + 1);
  }, [open]);

  useEffect(() => {
    if (open) setTimeout(() => firstRef.current?.focus(), 50);
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-overlay/40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="flex w-full max-w-[400px] max-h-[92vh] flex-col rounded-[20px] bg-surface"
          style={{ boxShadow: "0 20px 60px -12px rgba(26,20,20,0.25)" }}
        >
          <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-5">
            <div>
              <h2 className="font-display text-[17px] font-semibold text-text-primary">Add device</h2>
              <p className="mt-0.5 text-[13px] text-text-secondary">
                Required fields are marked with <span className="font-medium text-error">*</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-[9px] text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form
            key={formKey}
            action={formAction}
            className="flex flex-1 flex-col overflow-y-auto"
          >
            <div className="flex flex-col gap-5 px-6 py-6">
            {/* Device name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">
                Device name <span className="text-error">*</span>
              </label>
              <input
                ref={firstRef}
                name="fmModule"
                type="text"
                placeholder="e.g. AOT120, GT06N"
                required
                className={INPUT}
              />
            </div>

            {/* Supplier */}
            {suppliers.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-text-primary">Supplier</label>
                <div className="relative">
                  <select
                    name="supplierId"
                    defaultValue=""
                    className={INPUT + " w-full appearance-none pl-3 pr-8"}
                  >
                    <option value="">No supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                </div>
              </div>
            )}

            {/* Opening stock */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">Opening stock</label>
              <input
                name="openingStock"
                type="number"
                min="0"
                step="1"
                placeholder="0"
                className={INPUT}
              />
              <p className="text-[12px] text-text-muted">How many units you have right now</p>
            </div>

            <div className="border-t border-border" />

            {/* Prices */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-text-primary">Cost price</label>
                <input name="costPrice" type="number" min="0" placeholder="0" className={INPUT} />
                <p className="text-[12px] text-text-muted">What you paid</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-text-primary">Sale price</label>
                <input name="salePrice" type="number" min="0" placeholder="0" className={INPUT} />
                <p className="text-[12px] text-text-muted">What you charge</p>
              </div>
            </div>

            </div>

            <div className="mt-auto flex flex-shrink-0 gap-3 border-t border-border px-6 py-5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-10 rounded-[9px] border border-border bg-surface text-[14px] font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                Cancel
              </button>
              <SubmitButton
                pendingLabel="Saving…"
                className="flex-1 h-10 rounded-[9px] bg-accent text-[14px] font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ boxShadow: "0 1px 2px rgba(225,29,72,0.20), 0 4px 12px -4px rgba(225,29,72,0.40)" }}
              >
                Add device
              </SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
