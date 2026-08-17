"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { transferFunds, type AccountActionState } from "@/actions/accounts";
import { useActionToast } from "@/components/ui/ToastProvider";
import { SubmitButton } from "@/components/ui/SubmitButton";

export type AccountOption = { id: string; name: string; currentBalance: number };

type Props = {
  open: boolean;
  onClose: () => void;
  accounts: AccountOption[];
  prefilledFromId?: string | null;
};

const INPUT =
  "h-10 rounded-[9px] border border-border bg-surface px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors";
const SELECT = INPUT + " w-full appearance-none pl-3 pr-8";

const today = () => new Date().toISOString().slice(0, 10);

export function TransferFundsModal({ open, onClose, accounts, prefilledFromId }: Props) {
  const [state, formAction] = useActionState<AccountActionState, FormData>(transferFunds, null);

  useActionToast(state?.error);

  const [formKey, setFormKey] = useState(0);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.success) { onClose(); setFormKey((k) => k + 1); }
  }, [state?.success, onClose]);

  useEffect(() => { if (!open) setFormKey((k) => k + 1); }, [open]);
  useEffect(() => { if (open) setTimeout(() => amountRef.current?.focus(), 50); }, [open]);

  function fmtRs(v: number) {
    return `Rs ${Math.round(v).toLocaleString("en-PK")}`;
  }

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
              <h2 className="font-display text-[17px] font-semibold text-text-primary">Transfer funds</h2>
              <p className="mt-0.5 text-[13px] text-text-secondary">Move money between payment methods</p>
            </div>
            <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-[9px] text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary">
              <X className="h-4 w-4" />
            </button>
          </div>

          <form key={formKey} action={formAction} className="flex flex-1 flex-col overflow-y-auto">
            <div className="flex flex-col gap-5 px-6 py-6">
            {/* From */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">From <span className="text-error">*</span></label>
              <div className="relative">
                <select name="fromId" defaultValue={prefilledFromId ?? ""} required className={SELECT}>
                  <option value="">Select account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({fmtRs(a.currentBalance)})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              </div>
            </div>

            {/* To */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">To <span className="text-error">*</span></label>
              <div className="relative">
                <select name="toId" defaultValue="" required className={SELECT}>
                  <option value="">Select account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              </div>
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">Amount <span className="text-error">*</span></label>
              <input ref={amountRef} name="amount" type="number" min="1" step="any" placeholder="0" required className={INPUT} />
            </div>

            {/* Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">Date <span className="text-error">*</span></label>
              <input name="transferredAt" type="date" required defaultValue={today()} className={INPUT} />
            </div>

            {/* Note */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">Note</label>
              <input name="note" type="text" placeholder="Optional note" className={INPUT} />
            </div>

            </div>

            <div className="mt-auto flex flex-shrink-0 gap-3 border-t border-border px-6 py-5">
              <button type="button" onClick={onClose} className="h-10 flex-1 rounded-[9px] border border-border bg-surface text-[14px] font-medium text-text-secondary transition-colors hover:text-text-primary">
                Cancel
              </button>
              <SubmitButton
                pendingLabel="Transferring…"
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[9px] bg-accent text-[14px] font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ boxShadow: "0 1px 2px rgba(225,29,72,0.20), 0 4px 12px -4px rgba(225,29,72,0.40)" }}
              >
                Transfer
              </SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
