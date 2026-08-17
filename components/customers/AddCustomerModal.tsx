"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { upsertCustomer, type SaveCustomerState } from "@/actions/customers";
import type { CustomerRow } from "@/components/customers/CustomersView";
import { useActionToast } from "@/components/ui/ToastProvider";
import {
  InstallationBlockFields,
  newInstallationDraft,
  resolvedAmount,
  type InstallationDraft,
} from "@/components/customers/InstallationBlockFields";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { AccountOption } from "@/lib/accounts";
import type { InstallableDevice } from "@/lib/device-options";

type Props = {
  open: boolean;
  onClose: () => void;
  customer?: CustomerRow | null;
  accounts: AccountOption[];
  devices: InstallableDevice[];
};

const INPUT =
  "h-10 rounded-[9px] border border-border bg-surface px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors";
const MONO_INPUT = INPUT + " w-full font-mono placeholder:font-sans";
const SELECT = INPUT + " w-full appearance-none pl-3 pr-8";
const LABEL = "text-[13px] font-medium text-text-primary";

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function toPayload(draft: InstallationDraft, devices: InstallableDevice[]) {
  return {
    registrationNo: draft.registrationNo,
    installationDate: draft.installationDate,
    deviceIds: draft.deviceLines.map((l) => l.deviceId),
    deviceQuantities: draft.deviceLines.map((l) => l.quantity),
    amount: resolvedAmount(draft, devices),
    simPayment: draft.simPayment,
    discountMode: draft.discountMode,
    discountValue: draft.discountValue,
    amountPaid: draft.amountPaid,
    simNo: draft.simNo,
    accountId: draft.accountId,
  };
}

export function AddCustomerModal({ open, onClose, customer, accounts, devices }: Props) {
  const [state, formAction] = useActionState<SaveCustomerState, FormData>(upsertCustomer, null);

  useActionToast(state?.error);

  const [formKey, setFormKey] = useState(0);
  const [withInstallation, setWithInstallation] = useState(false);
  const [installations, setInstallations] = useState<InstallationDraft[]>([
    newInstallationDraft(1, todayStr()),
  ]);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!customer;

  const installationsJson = JSON.stringify(installations.map((d) => toPayload(d, devices)));

  function resetInstallation() {
    setWithInstallation(false);
    setInstallations([newInstallationDraft(1, todayStr())]);
  }

  function updateInstallation(key: number, patch: Partial<InstallationDraft>) {
    setInstallations((list) => list.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  }

  function addInstallation() {
    setInstallations((list) => [
      ...list,
      newInstallationDraft(Math.max(...list.map((d) => d.key), 0) + 1, todayStr()),
    ]);
  }

  function removeInstallation(key: number) {
    setInstallations((list) => list.filter((d) => d.key !== key));
  }

  // Reset form when switching between add / edit targets
  useEffect(() => {
    setFormKey((k) => k + 1);
    resetInstallation();
  }, [customer?.id]);

  // Close on success
  useEffect(() => {
    if (state?.success) {
      onClose();
      setFormKey((k) => k + 1);
      resetInstallation();
    }
  }, [state?.success, onClose]);

  // Focus the first field once the panel has rendered
  useEffect(() => {
    if (open) setTimeout(() => firstInputRef.current?.focus(), 50);
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-overlay/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="flex w-full max-w-[520px] max-h-[92vh] flex-col rounded-[20px] bg-surface"
          style={{ boxShadow: "0 20px 60px -12px rgba(26,20,20,0.25)" }}
        >
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-5">
            <div>
              <h2 className="font-display text-[17px] font-semibold text-text-primary">
                {isEditing ? "Edit customer" : "Add customer"}
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

          {/* Form */}
          <form key={formKey} action={formAction} className="flex flex-1 flex-col overflow-y-auto">
            <div className="flex flex-col gap-5 px-6 py-6">
              {isEditing && <input type="hidden" name="id" value={customer.id} />}

              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>
                  Full name <span className="text-error">*</span>
                </label>
                <input
                  ref={firstInputRef}
                  name="name"
                  type="text"
                  defaultValue={customer?.name ?? ""}
                  placeholder="e.g. Mumtaz Ahmad"
                  required
                  className={INPUT}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>
                  Phone number <span className="text-error">*</span>
                </label>
                <PhoneInput
                  name="phone"
                  defaultValue={customer?.phone ?? ""}
                  placeholder="03XXXXXXXXX"
                  required
                  className={INPUT + " font-mono"}
                />
                <p className="text-[12px] text-text-muted">Must be exactly 11 digits</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Address</label>
                <input
                  name="address"
                  type="text"
                  defaultValue={customer?.address ?? ""}
                  placeholder="e.g. Bahawalnagar"
                  className={INPUT}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={LABEL}>Remarks</label>
                <textarea
                  name="remarks"
                  rows={3}
                  defaultValue={customer?.remarks ?? ""}
                  placeholder="Any notes about this customer…"
                  className="resize-none rounded-[9px] border border-border bg-surface px-3 py-2.5 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors"
                />
              </div>

              {!isEditing && (
                <>
                  <label className="flex cursor-pointer items-center gap-3 rounded-[12px] border border-border bg-background px-4 py-3">
                    <input
                      name="withInstallation"
                      type="checkbox"
                      checked={withInstallation}
                      onChange={(e) => setWithInstallation(e.target.checked)}
                      className="h-4 w-4 flex-none accent-[var(--color-accent)]"
                    />
                    <span>
                      <span className="block text-[13px] font-semibold text-text-primary">
                        Add installations for this customer
                      </span>
                      <span className="block text-[12px] text-text-secondary">
                        Saves one or more vehicles in the same step — each renewal falls due one year later
                      </span>
                    </span>
                  </label>

                  {withInstallation && (
                    <div className="flex flex-col gap-4">
                      <input type="hidden" name="installationsJson" value={installationsJson} />

                      {installations.map((draft, i) => (
                        <InstallationBlockFields
                          key={draft.key}
                          index={i}
                          draft={draft}
                          onChange={(patch) => updateInstallation(draft.key, patch)}
                          onRemove={() => removeInstallation(draft.key)}
                          removable={installations.length > 1}
                          devices={devices}
                          accounts={accounts}
                          labelClassName={LABEL}
                          inputClassName={INPUT}
                          monoInputClassName={MONO_INPUT}
                          selectClassName={SELECT}
                        />
                      ))}

                      <button
                        type="button"
                        onClick={addInstallation}
                        className="flex h-9 w-fit items-center gap-1.5 rounded-[9px] border border-border bg-surface px-3 text-[13px] font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add another installation
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="mt-auto flex flex-shrink-0 gap-3 border-t border-border px-6 py-5">
              <button
                type="button"
                onClick={onClose}
                className="h-10 flex-1 rounded-[9px] border border-border bg-surface text-[14px] font-medium text-text-secondary transition-colors hover:border-border-muted hover:text-text-primary"
              >
                Cancel
              </button>
              <SubmitButton
                pendingLabel="Saving…"
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[9px] bg-accent text-[14px] font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{
                  boxShadow: "0 1px 2px rgba(225,29,72,0.20), 0 4px 12px -4px rgba(225,29,72,0.40)",
                }}
              >
                {isEditing ? "Update customer" : "Save customer"}
              </SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
