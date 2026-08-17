"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { updateDevice, type DeviceActionState } from "@/actions/devices";

export type EditDeviceTarget = {
  id: string;
  fmModule: string | null;
  costPrice: string | null;
  salePrice: string | null;
  status: string;
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
  const [state, formAction, isPending] = useActionState<DeviceActionState, FormData>(
    updateDevice,
    null
  );
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

      {state?.error && !state.success && (
        <div className="rounded-[9px] bg-error-light px-4 py-3">
          <p className="text-[13px] font-medium text-error-foreground">{state.error}</p>
        </div>
      )}

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

      <button
        type="submit"
        disabled={isPending}
        className="h-10 w-full rounded-[9px] bg-accent text-[14px] font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
        style={{ boxShadow: "0 1px 2px rgba(45,107,255,0.20), 0 4px 12px -4px rgba(45,107,255,0.40)" }}
      >
        {isPending && (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
        )}
        {isPending ? "Saving…" : "Save prices"}
      </button>
    </form>
  );
}

function FaultyForm({
  device,
  onSuccess,
}: {
  device: EditDeviceTarget;
  onSuccess: () => void;
}) {
  const [state, formAction, isPending] = useActionState<DeviceActionState, FormData>(
    updateDevice,
    null
  );

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state?.success, onSuccess]);

  const isAlreadyFaulty = device.status === "faulty";

  return (
    <div className="rounded-[12px] border border-error/30 bg-error-light/60 p-4">
      <div className="mb-3 flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-error" />
        <div>
          <p className="text-[13px] font-semibold text-text-primary">Mark as faulty</p>
          <p className="mt-0.5 text-[12px] text-text-secondary">
            This device will be removed from stock and flagged as faulty.
          </p>
        </div>
      </div>

      {isAlreadyFaulty ? (
        <p className="text-[13px] font-semibold text-error-foreground">Already marked as faulty</p>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="id" value={device.id} />
          <input type="hidden" name="markFaulty" value="true" />
          <button
            type="submit"
            disabled={isPending}
            className="h-9 w-full rounded-[9px] bg-error text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            {isPending ? "Marking…" : "Mark as faulty"}
          </button>

          {state?.error && !state.success && (
            <p className="mt-2 text-[12px] font-medium text-error-foreground">{state.error}</p>
          )}
        </form>
      )}
    </div>
  );
}

export function EditDeviceDrawer({ open, onClose, device }: Props) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-overlay/40 transition-opacity duration-300 ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[400px] flex-col bg-surface shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="font-display text-[17px] font-semibold text-text-primary">Edit device</h2>
            <p className="mt-0.5 text-[13px] text-text-secondary">
              {device?.fmModule ?? "—"}
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
            <div className="border-t border-border" />
            <FaultyForm device={device} onSuccess={onClose} />
          </div>
        )}
      </div>
    </>
  );
}
