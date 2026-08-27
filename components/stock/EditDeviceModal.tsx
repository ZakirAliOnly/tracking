"use client";

import { useActionState, useEffect, useState } from "react";
import { X } from "lucide-react";
import { updateDevice, type DeviceActionState } from "@/actions/devices";
import { useActionToast } from "@/components/ui/ToastProvider";
import { SubmitButton } from "@/components/ui/SubmitButton";

export type EditDeviceTarget = {
  id: string;
  fmModule: string | null;
  type: "device" | "sim";
  costPrice: string | null;
  salePrice: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  device: EditDeviceTarget | null;
};

const INPUT =
  "h-10 rounded-[9px] border border-border bg-surface px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors";

function PriceForm({
  device,
  onSuccess,
}: {
  device: EditDeviceTarget;
  onSuccess: () => void;
}) {
  const [state, formAction] = useActionState<DeviceActionState, FormData>(
    updateDevice,
    null
  );

  useActionToast(state?.error);

  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state?.success) {
      onSuccess();
      setFormKey((k) => k + 1);
    }
  }, [state?.success, onSuccess]);

  useEffect(() => {
    setFormKey((k) => k + 1);
  }, [device.id]);

  return (
    <form key={formKey} action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={device.id} />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-text-primary">Cost price</label>
          <input
            name="costPrice"
            type="number"
            min="0"
            placeholder="0"
            defaultValue={device.costPrice ?? ""}
            className={INPUT}
          />
          <p className="text-[12px] text-text-muted">What you paid</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-text-primary">Sale price</label>
          <input
            name="salePrice"
            type="number"
            min="0"
            placeholder="0"
            defaultValue={device.salePrice ?? ""}
            className={INPUT}
          />
          <p className="text-[12px] text-text-muted">What you charge</p>
        </div>
      </div>

      <SubmitButton
        pendingLabel="Saving…"
        className="h-10 w-full rounded-[9px] bg-accent text-[14px] font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ boxShadow: "0 1px 2px rgba(225,29,72,0.20), 0 4px 12px -4px rgba(225,29,72,0.40)" }}
      >
        Save prices
      </SubmitButton>
    </form>
  );
}

export function EditDeviceModal({ open, onClose, device }: Props) {
  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-overlay/40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="flex w-full max-w-[420px] max-h-[92vh] flex-col rounded-[20px] bg-surface"
          style={{ boxShadow: "0 20px 60px -12px rgba(26,20,20,0.25)" }}
        >
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-5">
            <div>
              <h2 className="font-display text-[17px] font-semibold text-text-primary">
                Edit device
              </h2>
              <p className="mt-0.5 text-[13px] text-text-secondary">
                {device?.fmModule ?? "—"}
                {device && (
                  <span className="ml-1.5 text-text-muted">
                    · {device.type === "sim" ? "Sim" : "Device"} pool
                  </span>
                )}
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

          {device && (
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
              <PriceForm device={device} onSuccess={onClose} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
