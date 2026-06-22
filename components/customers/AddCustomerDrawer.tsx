"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { upsertCustomer, type SaveCustomerState } from "@/actions/customers";
import type { CustomerRow } from "@/components/customers/CustomersView";

type Props = {
  open: boolean;
  onClose: () => void;
  customer?: CustomerRow | null;
};

export function AddCustomerDrawer({ open, onClose, customer }: Props) {
  const [state, formAction, isPending] = useActionState<SaveCustomerState, FormData>(
    upsertCustomer,
    null
  );
  const [formKey, setFormKey] = useState(0);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!customer;

  // Reset form when switching between add / edit targets
  useEffect(() => {
    setFormKey((k) => k + 1);
  }, [customer?.id]);

  // Close on success
  useEffect(() => {
    if (state?.success) {
      onClose();
      setFormKey((k) => k + 1);
    }
  }, [state?.success, onClose]);

  // Focus first field when drawer opens
  useEffect(() => {
    if (open) setTimeout(() => firstInputRef.current?.focus(), 300);
  }, [open]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-overlay/40 transition-opacity duration-300 ${
          open ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-[460px] flex-col bg-surface shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-5">
          <div>
            <h2 className="font-display text-[17px] font-semibold text-text-primary">
              {isEditing ? "Edit customer" : "Add customer"}
            </h2>
            <p className="mt-0.5 text-[13px] text-text-secondary">
              Required fields are marked with <span className="text-error font-medium">*</span>
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

        {/* Form */}
        <form
          key={formKey}
          action={formAction}
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6"
        >
          {/* Hidden id for edit mode */}
          {isEditing && <input type="hidden" name="id" value={customer.id} />}

          {/* Error banner */}
          {state?.error && !state.success && (
            <div className="rounded-[9px] bg-error-light px-4 py-3">
              <p className="text-[13px] font-medium text-error-foreground">{state.error}</p>
            </div>
          )}

          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-text-primary">
              Full name <span className="text-error">*</span>
            </label>
            <input
              ref={firstInputRef}
              name="name"
              type="text"
              defaultValue={customer?.name ?? ""}
              placeholder="e.g. Mumtaz Ahmad"
              required
              className="h-10 rounded-[9px] border border-border bg-surface px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors"
            />
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-text-primary">
              Phone number <span className="text-error">*</span>
            </label>
            <input
              name="phone"
              type="tel"
              defaultValue={customer?.phone ?? ""}
              placeholder="03XXXXXXXXX"
              maxLength={11}
              required
              className="h-10 rounded-[9px] border border-border bg-surface px-3 font-mono text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors"
            />
            <p className="text-[12px] text-text-muted">Must be exactly 11 digits</p>
          </div>

          {/* Address */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-text-primary">Address</label>
            <input
              name="address"
              type="text"
              defaultValue={customer?.address ?? ""}
              placeholder="e.g. Bahawalnagar"
              className="h-10 rounded-[9px] border border-border bg-surface px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors"
            />
          </div>

          {/* Remarks */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-text-primary">Remarks</label>
            <textarea
              name="remarks"
              rows={3}
              defaultValue={customer?.remarks ?? ""}
              placeholder="Any notes about this customer…"
              className="rounded-[9px] border border-border bg-surface px-3 py-2.5 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors resize-none"
            />
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Footer actions */}
          <div className="flex gap-3 border-t border-border pt-5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-[9px] border border-border bg-surface text-[14px] font-medium text-text-secondary transition-colors hover:border-border-muted hover:text-text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 h-10 rounded-[9px] bg-accent text-[14px] font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{
                boxShadow: "0 1px 2px rgba(45,107,255,0.20), 0 4px 12px -4px rgba(45,107,255,0.40)",
              }}
            >
              {isPending && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              )}
              {isPending ? "Saving…" : isEditing ? "Update customer" : "Save customer"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
