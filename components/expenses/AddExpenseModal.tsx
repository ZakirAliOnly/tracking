"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { addExpense, type ExpenseActionState } from "@/actions/expenses";
import { useActionToast } from "@/components/ui/ToastProvider";
import { SubmitButton } from "@/components/ui/SubmitButton";

export type AccountOption = { id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  accounts: AccountOption[];
};

const INPUT =
  "h-10 rounded-[9px] border border-border bg-surface px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors";

const SELECT = INPUT + " w-full appearance-none pl-3 pr-8";

const today = () => new Date().toISOString().slice(0, 10);

export function AddExpenseModal({ open, onClose, accounts }: Props) {
  const [state, formAction] = useActionState<ExpenseActionState, FormData>(
    addExpense,
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
          className="flex w-full max-w-[420px] max-h-[92vh] flex-col rounded-[20px] bg-surface"
          style={{ boxShadow: "0 20px 60px -12px rgba(26,20,20,0.25)" }}
        >
          <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-5">
            <div>
              <h2 className="font-display text-[17px] font-semibold text-text-primary">Add expense</h2>
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
              {/* Amount */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-text-primary">
                  Amount <span className="text-error">*</span>
                </label>
                <input
                  ref={firstRef}
                  name="amount"
                  type="number"
                  min="1"
                  step="any"
                  placeholder="0"
                  required
                  className={INPUT}
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-text-primary">
                  Description <span className="text-error">*</span>
                </label>
                <input
                  name="description"
                  type="text"
                  placeholder="What was this for?"
                  required
                  className={INPUT}
                />
              </div>

              {/* Payment method */}
              {accounts.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-text-primary">
                    Payment method <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <select name="accountId" defaultValue="" required className={SELECT}>
                      <option value="" disabled>
                        Select account
                      </option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  </div>
                  <p className="text-[12px] text-text-muted">The amount is deducted from this account</p>
                </div>
              )}

              {/* Date */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-text-primary">
                  Date <span className="text-error">*</span>
                </label>
                <input
                  name="spentAt"
                  type="date"
                  required
                  defaultValue={today()}
                  className={INPUT}
                />
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
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[9px] bg-accent text-[14px] font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ boxShadow: "0 1px 2px rgba(225,29,72,0.20), 0 4px 12px -4px rgba(225,29,72,0.40)" }}
              >
                Add expense
              </SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
