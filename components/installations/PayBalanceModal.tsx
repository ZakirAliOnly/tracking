"use client";

import { useActionState, useEffect, useState } from "react";
import { X } from "lucide-react";
import { payInstallationBalance, type InstallationActionState } from "@/actions/installations";
import { useActionToast } from "@/components/ui/ToastProvider";
import { SubmitButton } from "@/components/ui/SubmitButton";

export type PayTarget = {
  installationId: string;
  registrationNo: string;
  customerName: string;
  /** Rupees still owed, already worked out from total − discount − paid. */
  remaining: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  target: PayTarget | null;
};

function fmtRs(v: string | number) {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return `Rs ${Math.round(n || 0).toLocaleString("en-PK")}`;
}

export function PayBalanceModal({ open, onClose, target }: Props) {
  const [state, formAction] = useActionState<InstallationActionState, FormData>(
    payInstallationBalance,
    null
  );
  const [formKey, setFormKey] = useState(0);
  const [amount, setAmount] = useState("");

  useActionToast(state?.error);

  const owed = target ? parseFloat(target.remaining) : 0;

  useEffect(() => {
    if (state?.success) {
      onClose();
      setFormKey((k) => k + 1);
      setAmount("");
    }
  }, [state?.success, onClose]);

  useEffect(() => {
    if (!open) {
      setFormKey((k) => k + 1);
      setAmount("");
    }
  }, [open]);

  if (!open || !target) return null;

  const entered = parseFloat(amount) || 0;
  // Mirrors the server's own ceiling so the button is refused before a
  // round trip; the Server Action re-checks it against stored figures anyway
  const overpaying = entered > owed;
  const left = Math.max(owed - entered, 0);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-overlay/40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="flex w-full max-w-[420px] max-h-[92vh] flex-col rounded-[20px] bg-surface"
          style={{ boxShadow: "0 20px 60px -12px rgba(26,20,20,0.25)" }}
        >
          <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-5">
            <div>
              <h2 className="font-display text-[17px] font-semibold text-text-primary">
                Pay remaining
              </h2>
              <p className="mt-0.5 text-[13px] text-text-secondary">
                {target.registrationNo} · {target.customerName}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-[9px] text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form key={formKey} action={formAction} className="flex flex-1 flex-col overflow-y-auto">
            <input type="hidden" name="installationId" value={target.installationId} />

            <div className="flex flex-col gap-5 px-6 py-6">
              <div className="rounded-[12px] border border-border bg-background px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                  Still owed
                </p>
                <p className="mt-0.5 font-display text-[24px] font-bold leading-8 text-error">
                  {fmtRs(owed)}
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="pay-amount"
                  className="text-[12px] font-medium uppercase tracking-wider text-text-muted"
                >
                  Amount to pay <span className="text-error">*</span>
                </label>
                <input
                  id="pay-amount"
                  name="amount"
                  type="number"
                  min="0"
                  max={owed}
                  step="any"
                  required
                  autoFocus
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-10 rounded-[9px] border border-border bg-surface px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors"
                />

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setAmount(String(owed))}
                    className="text-[12.5px] font-medium text-accent transition-opacity hover:opacity-80"
                  >
                    Pay it all
                  </button>
                  {entered > 0 && !overpaying && (
                    <span className="text-[12.5px] text-text-secondary">
                      {left > 0 ? `${fmtRs(left)} would remain` : "Settles it in full"}
                    </span>
                  )}
                </div>

                {overpaying && (
                  <p className="text-[12.5px] font-medium text-error">
                    That is more than the {fmtRs(owed)} still owed.
                  </p>
                )}
              </div>
            </div>

            <div className="mt-auto flex flex-shrink-0 gap-3 border-t border-border px-6 py-5">
              <button
                type="button"
                onClick={onClose}
                className="h-10 flex-1 rounded-[9px] border border-border bg-surface text-[14px] font-medium text-text-secondary transition-colors hover:text-text-primary"
              >
                Cancel
              </button>
              <SubmitButton
                pendingLabel="Saving…"
                disabled={entered <= 0 || overpaying}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[9px] bg-accent text-[14px] font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                style={{ boxShadow: "0 1px 2px rgba(225,29,72,0.20), 0 4px 12px -4px rgba(225,29,72,0.40)" }}
              >
                Record payment
              </SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
