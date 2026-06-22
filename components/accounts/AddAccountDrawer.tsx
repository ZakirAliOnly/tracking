"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { addAccount, editAccount, type AccountActionState } from "@/actions/accounts";

export type AccountEditTarget = {
  id: string;
  name: string;
  type: string;
  openingBalance: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  editTarget?: AccountEditTarget | null;
};

const INPUT =
  "h-10 rounded-[9px] border border-border bg-surface px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors";

const TYPES = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "wallet", label: "Wallet / Mobile" },
];

export function AddAccountDrawer({ open, onClose, editTarget }: Props) {
  const isEdit = !!editTarget;
  const action = isEdit ? editAccount : addAccount;

  const [state, formAction, isPending] = useActionState<AccountActionState, FormData>(action, null);
  const [formKey, setFormKey] = useState(0);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.success) { onClose(); setFormKey((k) => k + 1); }
  }, [state?.success, onClose]);

  useEffect(() => { if (!open) setFormKey((k) => k + 1); }, [open]);
  useEffect(() => { if (open) setTimeout(() => firstRef.current?.focus(), 300); }, [open]);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-overlay/40 transition-opacity duration-300 ${open ? "visible opacity-100" : "invisible opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[400px] flex-col bg-surface shadow-2xl transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="font-display text-[17px] font-semibold text-text-primary">
              {isEdit ? "Edit method" : "Add payment method"}
            </h2>
            <p className="mt-0.5 text-[13px] text-text-secondary">
              Required fields are marked with <span className="font-medium text-error">*</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-[9px] text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form key={formKey} action={formAction} className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
          {state?.error && !state.success && (
            <div className="rounded-[9px] bg-error-light px-4 py-3">
              <p className="text-[13px] font-medium text-error-foreground">{state.error}</p>
            </div>
          )}

          {isEdit && <input type="hidden" name="id" value={editTarget!.id} />}

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-text-primary">Method name <span className="text-error">*</span></label>
            <input ref={firstRef} name="name" type="text" placeholder="e.g. Cash, HBL Bank, JazzCash" required defaultValue={editTarget?.name ?? ""} className={INPUT} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-text-primary">Type</label>
            <div className="relative">
              <select name="type" defaultValue={editTarget?.type ?? "cash"} className={INPUT + " w-full appearance-none pl-3 pr-8"}>
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-text-primary">Opening balance</label>
            <input
              name="openingBalance"
              type="number"
              min="0"
              step="any"
              placeholder="0"
              defaultValue={editTarget?.openingBalance && parseFloat(editTarget.openingBalance) > 0 ? editTarget.openingBalance : ""}
              className={INPUT}
            />
            <p className="text-[12px] text-text-muted">Amount already in this account before using this system</p>
          </div>

          <div className="flex-1" />

          <div className="flex gap-3 border-t border-border pt-5">
            <button type="button" onClick={onClose} className="h-10 flex-1 rounded-[9px] border border-border bg-surface text-[14px] font-medium text-text-secondary transition-colors hover:text-text-primary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[9px] bg-accent text-[14px] font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ boxShadow: "0 1px 2px rgba(45,107,255,0.20), 0 4px 12px -4px rgba(45,107,255,0.40)" }}
            >
              {isPending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Add method"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
