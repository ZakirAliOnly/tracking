"use client";

import { useActionState, useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { recordRenewal, type RenewalActionState } from "@/actions/renewals";
import { useActionToast } from "@/components/ui/ToastProvider";
import { SubmitButton } from "@/components/ui/SubmitButton";

export type AccountOption = { id: string; name: string };
export type InstallationOption = {
  id: string;
  customerName: string;
  registrationNo: string;
  accountId: string | null;
  prefillAmount: string;
  prefillSimOsting: string;
  prefillNet: string;
  nextRenewalDateIso: string;
};

export type PreFill = {
  installationId: string;
  customerName: string;
  registrationNo: string;
  accountId: string | null;
  dueDateDisplay: string;
  nextRenewalDate: string;
  amount: string;
  simOsting: string;
  net: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  preFill: PreFill | null;
  installationOptions: InstallationOption[];
  accounts: AccountOption[];
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addOneYear(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

const INPUT =
  "h-10 rounded-[9px] border border-border bg-surface px-3 text-[14px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors";
const SELECT = INPUT + " w-full appearance-none pl-3 pr-8";

export function RecordRenewalModal({
  open,
  onClose,
  preFill,
  installationOptions,
  accounts,
}: Props) {
  const [state, formAction] = useActionState<RenewalActionState, FormData>(
    recordRenewal,
    null
  );

  useActionToast(state?.error);

  const [formKey, setFormKey] = useState(0);

  // Customer + vehicle dropdowns — only used when there is no preFill
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedInstId, setSelectedInstId] = useState("");

  const customerNames = Array.from(new Set(installationOptions.map((o) => o.customerName))).sort(
    (a, b) => a.localeCompare(b)
  );

  const carsForCustomer = installationOptions.filter((o) => o.customerName === selectedCustomer);

  const resolved: PreFill | null = preFill ?? (() => {
    const inst = installationOptions.find((o) => o.id === selectedInstId);
    if (!inst) return null;
    const dueIso = inst.nextRenewalDateIso.slice(0, 10);
    return {
      installationId: inst.id,
      customerName: inst.customerName,
      registrationNo: inst.registrationNo,
      accountId: inst.accountId,
      dueDateDisplay: dueIso,
      nextRenewalDate: addOneYear(dueIso),
      amount: inst.prefillAmount,
      simOsting: inst.prefillSimOsting,
      net: inst.prefillNet,
    };
  })();

  function reset() {
    setSelectedCustomer("");
    setSelectedInstId("");
  }

  useEffect(() => {
    if (state?.success) {
      onClose();
      setFormKey((k) => k + 1);
      reset();
    }
  }, [state?.success, onClose]);

  useEffect(() => {
    if (!open) {
      setFormKey((k) => k + 1);
      reset();
    }
  }, [open]);

  // Picking a different customer drops any vehicle already chosen for the last one
  useEffect(() => {
    setSelectedInstId("");
  }, [selectedCustomer]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-overlay/40 backdrop-blur-sm" onClick={onClose} />

      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="flex w-full max-w-[520px] max-h-[92vh] flex-col rounded-[20px] bg-surface"
          style={{ boxShadow: "0 20px 60px -12px rgba(26,20,20,0.25)" }}
        >
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-5">
            <div>
              <h2 className="font-display text-[17px] font-semibold text-text-primary">
                Record renewal
              </h2>
              <p className="mt-0.5 text-[13px] text-text-secondary">
                Required fields are marked with{" "}
                <span className="font-medium text-error">*</span>
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
            {/* Hidden fields */}
            {resolved && (
              <input type="hidden" name="installationId" value={resolved.installationId} />
            )}

            {preFill ? (
              <div className="rounded-[12px] border border-border bg-surface-muted px-4 py-3.5">
                <p className="text-[13px] font-semibold text-text-primary">{preFill.customerName}</p>
                <p className="mt-0.5 font-mono text-[12px] text-text-secondary">
                  {preFill.registrationNo}
                </p>
                {preFill.dueDateDisplay && (
                  <p className="mt-1 text-[12px] text-text-muted">
                    Due: {preFill.dueDateDisplay}
                  </p>
                )}
              </div>
            ) : (
              <>
                {/* Customer */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-text-primary">
                    Customer <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedCustomer}
                      onChange={(e) => setSelectedCustomer(e.target.value)}
                      required
                      autoFocus
                      className={SELECT}
                    >
                      <option value="" disabled>Select customer…</option>
                      {customerNames.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  </div>
                </div>

                {/* Vehicle */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-text-primary">
                    Vehicle <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedInstId}
                      onChange={(e) => setSelectedInstId(e.target.value)}
                      required
                      disabled={!selectedCustomer}
                      className={SELECT + " disabled:cursor-not-allowed disabled:opacity-50"}
                    >
                      <option value="" disabled>
                        {selectedCustomer ? "Select vehicle…" : "Select a customer first"}
                      </option>
                      {carsForCustomer.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.registrationNo}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  </div>
                </div>
              </>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-text-primary">
                  Payment date <span className="text-error">*</span>
                </label>
                <input
                  name="renewedAt"
                  type="date"
                  defaultValue={todayIso()}
                  required
                  className={INPUT}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-text-primary">
                  Next renewal <span className="text-error">*</span>
                </label>
                <input
                  name="nextRenewalDate"
                  type="date"
                  defaultValue={resolved?.nextRenewalDate ?? ""}
                  key={`next-${resolved?.installationId ?? "none"}`}
                  required
                  className={INPUT}
                />
              </div>
            </div>

            {/* Payment method */}
            {accounts.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-text-primary">
                  Payment Method <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <select
                    name="accountId"
                    defaultValue={resolved?.accountId ?? ""}
                    key={`acct-${resolved?.installationId ?? "none"}`}
                    required
                    className={SELECT}
                  >
                    <option value="" disabled>Choose a payment method</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                </div>
              </div>
            )}

            <div className="border-t border-border" />

            {/* Amount */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-text-primary">
                Amount <span className="text-error">*</span>
              </label>
              <input
                name="amount"
                type="number"
                min="0"
                placeholder="0"
                defaultValue={resolved?.amount ?? ""}
                key={`amt-${resolved?.installationId ?? "none"}`}
                required
                className={INPUT}
              />
            </div>

            {/* SIM & Osting + Net side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-text-primary">SIM &amp; Osting</label>
                <input
                  name="simOsting"
                  type="number"
                  min="0"
                  placeholder="0"
                  defaultValue={resolved?.simOsting ?? "0"}
                  key={`sim-${resolved?.installationId ?? "none"}`}
                  className={INPUT}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-text-primary">Net</label>
                <input
                  name="net"
                  type="number"
                  min="0"
                  placeholder="0"
                  defaultValue={resolved?.net ?? "0"}
                  key={`net-${resolved?.installationId ?? "none"}`}
                  className={INPUT}
                />
              </div>
            </div>

            {/* Other */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-text-primary">Other</label>
                <input
                  name="other"
                  type="number"
                  min="0"
                  placeholder="0"
                  defaultValue="0"
                  key={`other-${resolved?.installationId ?? "none"}`}
                  className={INPUT}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-text-primary">Other note</label>
                <input
                  name="otherNote"
                  type="text"
                  placeholder="Optional note"
                  className={INPUT}
                />
              </div>
            </div>

            </div>

            {/* Footer */}
            <div className="mt-auto flex flex-shrink-0 gap-3 border-t border-border px-6 py-5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-10 rounded-[9px] border border-border bg-surface text-[14px] font-medium text-text-secondary transition-colors hover:border-border-muted hover:text-text-primary"
              >
                Cancel
              </button>
              <SubmitButton
                pendingLabel="Saving…"
                disabled={!resolved}
                className="flex-1 h-10 rounded-[9px] bg-accent text-[14px] font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                style={{
                  boxShadow: "0 1px 2px rgba(225,29,72,0.20), 0 4px 12px -4px rgba(225,29,72,0.40)",
                }}
              >
                Mark as received
              </SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
