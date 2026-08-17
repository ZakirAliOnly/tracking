"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { addSupplier, editSupplier, type SupplierActionState } from "@/actions/suppliers";
import { useActionToast } from "@/components/ui/ToastProvider";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { PhoneInput } from "@/components/ui/PhoneInput";

export type SupplierEditTarget = {
  id: string;
  name: string;
  phone: string | null;
  contactName: string | null;
  address: string | null;
  openingOwed: string;
  supplies: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  editTarget?: SupplierEditTarget | null;
};

const INPUT =
  "h-10 rounded-[9px] border border-border bg-surface px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors";

export function AddSupplierModal({ open, onClose, editTarget }: Props) {
  const isEdit = !!editTarget;
  const action = isEdit ? editSupplier : addSupplier;

  const [state, formAction] = useActionState<SupplierActionState, FormData>(
    action,
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
              <h2 className="font-display text-[17px] font-semibold text-text-primary">
                {isEdit ? "Edit supplier" : "Add supplier"}
              </h2>
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
            {isEdit && <input type="hidden" name="id" value={editTarget!.id} />}

            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">
                Supplier name <span className="text-error">*</span>
              </label>
              <input
                ref={firstRef}
                name="name"
                type="text"
                placeholder="e.g. Ali Electronics"
                required
                defaultValue={editTarget?.name ?? ""}
                className={INPUT}
              />
            </div>

            {/* Phone */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">Phone</label>
              <PhoneInput
                name="phone"
                defaultValue={editTarget?.phone ?? ""}
                className={INPUT}
              />
            </div>

            {/* Contact name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">Contact name</label>
              <input
                name="contactName"
                type="text"
                placeholder="Contact person"
                defaultValue={editTarget?.contactName ?? ""}
                className={INPUT}
              />
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">Address</label>
              <input
                name="address"
                type="text"
                placeholder="Shop / city"
                defaultValue={editTarget?.address ?? ""}
                className={INPUT}
              />
            </div>

            {/* Opening owed */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">Opening owed</label>
              <input
                name="openingOwed"
                type="number"
                min="0"
                step="any"
                placeholder="0"
                defaultValue={editTarget?.openingOwed && parseFloat(editTarget.openingOwed) > 0 ? editTarget.openingOwed : ""}
                className={INPUT}
              />
              <p className="text-[12px] text-text-muted">Amount you already owed before using this system</p>
            </div>

            {/* Supplies */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">Supplies</label>
              <input
                name="supplies"
                type="text"
                placeholder="e.g. GPS trackers, SIM cards"
                defaultValue={editTarget?.supplies ?? ""}
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
                {isEdit ? "Save changes" : "Add supplier"}
              </SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
