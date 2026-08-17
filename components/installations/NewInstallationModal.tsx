"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, ChevronDown, Search, UserPlus, X } from "lucide-react";
import { createInstallations, type InstallationActionState } from "@/actions/installations";
import { useActionToast } from "@/components/ui/ToastProvider";
import { PhoneInput } from "@/components/ui/PhoneInput";
import {
  DeviceLines,
  deviceSubtotal,
  newDeviceLine,
  type DeviceLineDraft,
} from "@/components/installations/DeviceLines";
import { PaymentSummary } from "@/components/installations/PaymentSummary";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { AccountOption } from "@/lib/accounts";
import type { InstallableDevice } from "@/lib/device-options";
import { resolvePayment, type DiscountMode } from "@/lib/installation-money";

export type CustomerOption = { id: string; name: string };

const INPUT =
  "h-10 rounded-[9px] border border-border bg-surface px-3 text-[13px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors";
const MONO_INPUT =
  "h-10 w-full rounded-[9px] border border-border bg-surface px-3 font-mono text-[13px] text-text-primary placeholder:font-sans placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-light transition-colors";
const SELECT = INPUT + " w-full appearance-none pl-3 pr-8";
const FIELD_LABEL = "text-[12px] font-medium uppercase tracking-wider text-text-muted";

const MAX_SUGGESTIONS = 6;

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

type Props = {
  open: boolean;
  onClose: () => void;
  customers: CustomerOption[];
  accounts: AccountOption[];
  devices: InstallableDevice[];
};

export function NewInstallationModal({ open, onClose, customers, accounts, devices }: Props) {
  const [state, formAction] = useActionState<InstallationActionState, FormData>(
    createInstallations,
    null
  );

  useActionToast(state?.error);

  const [formKey, setFormKey] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [installationDate, setInstallationDate] = useState(todayStr());
  const [deviceLines, setDeviceLines] = useState<DeviceLineDraft[]>([newDeviceLine(1)]);
  // null means the Amount box is still following the devices
  const [amountOverride, setAmountOverride] = useState<string | null>(null);
  const [simPayment, setSimPayment] = useState("");
  const [discountMode, setDiscountMode] = useState<DiscountMode>("fixed");
  const [discountValue, setDiscountValue] = useState("");
  const [amountPaid, setAmountPaid] = useState("");

  const query = customerName.trim().toLowerCase();

  // The typed name is the identity, so an exact match is the same customer
  // whether it was picked from the list or typed out by hand
  const matchedCustomer = customers.find((c) => c.name.trim().toLowerCase() === query) ?? null;

  const suggestions =
    query === ""
      ? []
      : customers.filter((c) => c.name.toLowerCase().includes(query)).slice(0, MAX_SUGGESTIONS);

  const subtotal = deviceSubtotal(deviceLines, devices);
  const amountValue = amountOverride ?? (subtotal > 0 ? String(subtotal) : "");

  // The same function the Server Action uses, so the figures shown are the
  // figures stored
  const money = resolvePayment({
    amount: parseFloat(amountValue) || 0,
    simPayment: parseFloat(simPayment) || 0,
    discountMode,
    discountValue: parseFloat(discountValue) || 0,
    amountPaid: parseFloat(amountPaid) || 0,
  });

  function reset() {
    setCustomerName("");
    setSearchOpen(false);
    setActiveIndex(0);
    setInstallationDate(todayStr());
    setDeviceLines([newDeviceLine(1)]);
    setAmountOverride(null);
    setSimPayment("");
    setDiscountMode("fixed");
    setDiscountValue("");
    setAmountPaid("");
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

  function handleSearchKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setSearchOpen(false);
      return;
    }
    if (!searchOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      setCustomerName(suggestions[activeIndex].name);
      setSearchOpen(false);
    }
  }

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
                New installation
              </h2>
              <p className="mt-0.5 text-[13px] text-text-secondary">
                Renewal falls due one year after the installation date
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

          <form key={formKey} action={formAction} className="flex flex-1 flex-col overflow-y-auto">
            <input type="hidden" name="customerName" value={customerName} />
            <input type="hidden" name="installationDate" value={installationDate} />

            <div className="flex flex-col gap-5 px-6 py-6">
              {/* Client Name */}
              <div className="relative flex flex-col gap-1.5">
                <label className={FIELD_LABEL}>
                  Client Name <span className="text-error">*</span>
                </label>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  <input
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      setSearchOpen(true);
                      setActiveIndex(0);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    onBlur={() => setSearchOpen(false)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search a customer, or type a new name"
                    autoComplete="off"
                    required
                    className={INPUT + " w-full pl-9"}
                  />
                </div>

                {searchOpen && suggestions.length > 0 && (
                  <ul
                    className="absolute top-full z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-[9px] border border-border bg-surface py-1"
                    style={{ boxShadow: "0 8px 24px -6px rgba(26,20,20,0.22)" }}
                  >
                    {suggestions.map((c, i) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          // Fires before blur closes the list
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setCustomerName(c.name);
                            setSearchOpen(false);
                          }}
                          onMouseEnter={() => setActiveIndex(i)}
                          className={`w-full px-3 py-2 text-left text-[13px] font-medium text-text-primary transition-colors ${
                            i === activeIndex ? "bg-accent-light" : "hover:bg-surface-muted"
                          }`}
                        >
                          {c.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {matchedCustomer ? (
                  <p className="flex items-center gap-1.5 text-[12px] text-success-foreground">
                    <Check className="h-3.5 w-3.5" />
                    Adding to the existing customer {matchedCustomer.name}
                  </p>
                ) : customerName.trim() !== "" ? (
                  <p className="flex items-center gap-1.5 text-[12px] text-accent-dark">
                    <UserPlus className="h-3.5 w-3.5" />
                    No customer by this name — a new one will be created
                  </p>
                ) : (
                  <p className="text-[12px] text-text-muted">
                    Existing customers appear as you type
                  </p>
                )}
              </div>

              {/* Registration No + date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={FIELD_LABEL}>
                    Registration No <span className="text-error">*</span>
                  </label>
                  <input
                    name="registrationNo"
                    placeholder="BHN-058"
                    required
                    className={MONO_INPUT}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={FIELD_LABEL}>
                    Installetion Date <span className="text-error">*</span>
                  </label>
                  <input
                    type="date"
                    value={installationDate}
                    onChange={(e) => setInstallationDate(e.target.value)}
                    required
                    className={INPUT}
                  />
                </div>
              </div>

              {/* Devices from stock — their sale prices price the job */}
              <DeviceLines
                lines={deviceLines}
                devices={devices}
                onChange={setDeviceLines}
                labelClassName={FIELD_LABEL}
                inputClassName={INPUT}
                selectClassName={SELECT}
              />

              {/* Money */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={FIELD_LABEL}>Amount</label>
                  <input
                    name="amount"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={amountValue}
                    onChange={(e) => setAmountOverride(e.target.value)}
                    className={INPUT}
                  />
                  <p className="text-[12px] text-text-muted">
                    {amountOverride === null
                      ? "From the devices — you can change it"
                      : "Changed by hand"}
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={FIELD_LABEL}>Sim</label>
                  <input
                    name="simPayment"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={simPayment}
                    onChange={(e) => setSimPayment(e.target.value)}
                    className={INPUT}
                  />
                </div>
              </div>

              {/* Payment method */}
              {accounts.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className={FIELD_LABEL}>
                    Payment Method <span className="text-error">*</span>
                  </label>
                  <div className="relative">
                    <select name="accountId" defaultValue="" required className={SELECT}>
                      <option value="">Choose a payment method</option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  </div>
                  <p className="text-[12px] text-text-muted">Where this money landed</p>
                </div>
              )}

              {/* Sim number */}
              <div className="flex flex-col gap-1.5">
                <label className={FIELD_LABEL}>Sim Number</label>
                <PhoneInput name="simNo" className={MONO_INPUT} />
                <p className="text-[12px] text-text-muted">11 digits, or leave blank</p>
              </div>

              {/* Discount + what has been paid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={FIELD_LABEL}>Discount</label>
                  <div className="flex gap-2">
                    <input
                      name="discountValue"
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className={INPUT + " w-full"}
                    />
                    <div className="relative flex-none">
                      <select
                        name="discountMode"
                        value={discountMode}
                        onChange={(e) => setDiscountMode(e.target.value as DiscountMode)}
                        className={SELECT + " w-[74px]"}
                      >
                        <option value="fixed">Rs</option>
                        <option value="percent">%</option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={FIELD_LABEL}>Amount Paid</label>
                  <input
                    name="amountPaid"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className={INPUT}
                  />
                </div>
              </div>

              {money.total > 0 && <PaymentSummary money={money} />}
            </div>

            {/* Footer */}
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
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[9px] bg-accent text-[14px] font-semibold text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{
                  boxShadow: "0 1px 2px rgba(225,29,72,0.20), 0 4px 12px -4px rgba(225,29,72,0.40)",
                }}
              >
                Save installation
              </SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
