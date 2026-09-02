"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, ChevronDown, Search, SlidersHorizontal, UserPlus, X } from "lucide-react";
import { createInstallations, type InstallationActionState } from "@/actions/installations";
import { useActionToast } from "@/components/ui/ToastProvider";
import { PhoneInput } from "@/components/ui/PhoneInput";
import {
  DeviceLines,
  deviceSubtotal,
  newDeviceLine,
  type DeviceLineDraft,
} from "@/components/installations/DeviceLines";
import { SimPicker, simAmountOf } from "@/components/installations/SimPicker";
import { PaymentSummary } from "@/components/installations/PaymentSummary";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { AccountOption } from "@/lib/accounts";
import type { InstallableDevice } from "@/lib/device-options";
import { resolvePayment, type DiscountMode } from "@/lib/installation-money";

export type CustomerOption = { id: string; name: string };

export type EditTarget = {
  customerName: string;
  registrationNo: string;
  installationDate: string;
  fittedDevices: { deviceId: string; quantity: number; type: "device" | "sim" }[];
  amount: string;
  discount: string;
  amountPaid: string;
  accountId: string | null;
  phone: string;
  address: string | null;
  contacts: { name: string; mobile: string; position: number }[];
  carDescription: string | null;
  make: string | null;
  model: string | null;
  engineNo: string | null;
  chassisNo: string | null;
  colour: string | null;
  gsmNo: string | null;
  fmModule: string | null;
  cutOff: string | null;
  imeiNo: string | null;
};

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
  /** Present only when reusing this form to edit an existing installation. */
  editTarget?: EditTarget | null;
};

function deviceLinesFrom(fitted: EditTarget["fittedDevices"] | undefined): DeviceLineDraft[] {
  const deviceLines = (fitted ?? []).filter((d) => d.type === "device");
  if (deviceLines.length === 0) return [newDeviceLine(1)];
  return deviceLines.map((d, i) => ({ key: i + 1, deviceId: d.deviceId, quantity: String(d.quantity) }));
}

function simIdFrom(fitted: EditTarget["fittedDevices"] | undefined): string {
  return (fitted ?? []).find((d) => d.type === "sim")?.deviceId ?? "";
}

export function NewInstallationModal({
  open,
  onClose,
  customers,
  accounts,
  devices,
  editTarget = null,
}: Props) {
  const [state, formAction] = useActionState<InstallationActionState, FormData>(
    createInstallations,
    null
  );

  useActionToast(state?.error);

  const isEdit = editTarget !== null;

  const [formKey, setFormKey] = useState(0);
  const [customerName, setCustomerName] = useState(editTarget?.customerName ?? "");
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [installationDate, setInstallationDate] = useState(editTarget?.installationDate ?? todayStr());
  const [deviceLines, setDeviceLines] = useState<DeviceLineDraft[]>(deviceLinesFrom(editTarget?.fittedDevices));
  const [simId, setSimId] = useState(simIdFrom(editTarget?.fittedDevices));
  // null means the Amount box is still following the devices
  const [amountOverride, setAmountOverride] = useState<string | null>(editTarget?.amount ?? null);
  const [discountMode, setDiscountMode] = useState<DiscountMode>("fixed");
  const [discountValue, setDiscountValue] = useState(editTarget?.discount ?? "");
  const [amountPaid, setAmountPaid] = useState(editTarget?.amountPaid ?? "");
  const [moreOpen, setMoreOpen] = useState(editTarget !== null);

  const query = customerName.trim().toLowerCase();

  // The typed name is the identity, so an exact match is the same customer
  // whether it was picked from the list or typed out by hand
  const matchedCustomer = customers.find((c) => c.name.trim().toLowerCase() === query) ?? null;

  const suggestions =
    query === ""
      ? []
      : customers.filter((c) => c.name.toLowerCase().includes(query)).slice(0, MAX_SUGGESTIONS);

  const subtotal = deviceSubtotal(deviceLines, devices);

  // Device and Sim amounts follow the picked stock line's sale price — read
  // only, same as Amount used to before it became independently adjustable
  const deviceAmount = subtotal;
  const simAmount = simAmountOf(simId, devices);
  const combinedDefault = deviceAmount + simAmount;
  const amountValue = amountOverride ?? (combinedDefault > 0 ? String(combinedDefault) : "");

  // The same function the Server Action uses, so the figures shown are the
  // figures stored
  const money = resolvePayment({
    amount: parseFloat(amountValue) || 0,
    simPayment: simAmount,
    discountMode,
    discountValue: parseFloat(discountValue) || 0,
    amountPaid: parseFloat(amountPaid) || 0,
  });

  // Mirrors the Server Action: a method is only needed when money actually
  // moved — something paid, against a job worth something
  const hasPaid = money.total > 0 && money.amountPaid > 0;

function reset(target: EditTarget | null) {
    setCustomerName(target?.customerName ?? "");
    setSearchOpen(false);
    setActiveIndex(0);
    setInstallationDate(target?.installationDate ?? todayStr());
    setDeviceLines(deviceLinesFrom(target?.fittedDevices));
    setSimId(simIdFrom(target?.fittedDevices));
    setAmountOverride(target?.amount ?? null);
    setDiscountMode("fixed");
    setDiscountValue(target?.discount ?? "");
    setAmountPaid(target?.amountPaid ?? "");
    setMoreOpen(target !== null);
  }

  useEffect(() => {
    if (state?.success) {
      onClose();
      setFormKey((k) => k + 1);
      reset(null);
    }
  }, [state?.success, onClose]);

  // Re-seeds every time the modal opens, so switching from editing one row to
  // creating a new one (or to a different row) never carries over stale state
  useEffect(() => {
    if (open) {
      setFormKey((k) => k + 1);
      reset(editTarget);
    }
  }, [open, editTarget]);

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
                {isEdit ? "Edit installation" : "New installation"}
              </h2>
              <p className="mt-0.5 text-[13px] text-text-secondary">
                {isEdit
                  ? "Saves to this same installation — changing Registration No moves it to a different vehicle"
                  : "Renewal falls due one year after the installation date"}
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
                    defaultValue={editTarget?.registrationNo ?? ""}
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

              {/* Sim from stock — one line, its sale price becomes the Sim amount */}
              <SimPicker
                simId={simId}
                devices={devices}
                onChange={setSimId}
                labelClassName={FIELD_LABEL}
                selectClassName={SELECT}
              />
              {simId && <input type="hidden" name="deviceId" value={simId} />}
              {simId && <input type="hidden" name="deviceQuantity" value="1" />}

              {/* Device / Sim amounts — read only, follow the picked stock line's sale price */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className={FIELD_LABEL}>Device amount</label>
                  <div className={`${INPUT} flex items-center bg-surface-muted text-text-secondary`}>
                    {deviceAmount > 0 ? `Rs ${deviceAmount.toLocaleString("en-PK")}` : "—"}
                  </div>
                  <input type="hidden" name="devicePayment" value={deviceAmount} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={FIELD_LABEL}>Sim amount</label>
                  <div className={`${INPUT} flex items-center bg-surface-muted text-text-secondary`}>
                    {simAmount > 0 ? `Rs ${simAmount.toLocaleString("en-PK")}` : "—"}
                  </div>
                  <input type="hidden" name="simPayment" value={simAmount} />
                </div>
              </div>

              {/* Money */}
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
                    ? "From the device and sim — you can change it"
                    : "Changed by hand"}
                </p>
              </div>

              {/* Payment method — only required once something has been paid */}
              {accounts.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className={FIELD_LABEL}>
                    Payment Method {hasPaid && <span className="text-error">*</span>}
                  </label>
                  <div className="relative">
                    <select
                      name="accountId"
                      defaultValue={editTarget?.accountId ?? ""}
                      required={hasPaid}
                      className={SELECT}
                    >
                      <option value="">
                        {hasPaid ? "Choose a payment method" : "No payment method"}
                      </option>
                      {accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                  </div>
                  <p className="text-[12px] text-text-muted">
                    {hasPaid
                      ? "Where this money landed"
                      : "Needed once an Amount Paid is entered"}
                  </p>
                </div>
              )}

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

              {/* More details — contacts, address, vehicle, device reference */}
              <div className="rounded-[12px] border border-border">
                <button
                  type="button"
                  onClick={() => setMoreOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="flex items-center gap-2 text-[13px] font-semibold text-text-primary">
                    <SlidersHorizontal className="h-3.5 w-3.5 text-text-muted" />
                    More details
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-text-muted transition-transform ${
                      moreOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {moreOpen && (
                  <div className="flex flex-col gap-5 border-t border-border px-4 py-4">
                    {/* Address */}
                    <div className="flex flex-col gap-1.5">
                      <label className={FIELD_LABEL}>Address</label>
                      <input
                        name="address"
                        defaultValue={editTarget?.address ?? ""}
                        placeholder="12 Mall Road, Lahore"
                        className={INPUT}
                      />
                    </div>

                    {/* Contacts */}
                    <div className="flex flex-col gap-2">
                      <label className={FIELD_LABEL}>Contacts</label>
                      {([1, 2, 3, 4] as const).map((n) => {
                        const c = editTarget?.contacts.find((c) => c.position === n);
                        return (
                          <div key={n} className="grid grid-cols-2 gap-2">
                            <input
                              name={`contact${n}Name`}
                              defaultValue={c?.name ?? ""}
                              placeholder={`Contact ${n} name`}
                              className={INPUT}
                            />
                            <PhoneInput
                              name={`contact${n}Mobile`}
                              defaultValue={c?.mobile ?? ""}
                              className={MONO_INPUT}
                            />
                          </div>
                        );
                      })}
                      <p className="text-[12px] text-text-muted">
                        Contact 1's mobile does not replace Phone above — enter both if they differ
                      </p>
                    </div>

                    {/* Vehicle detail */}
                    <div className="flex flex-col gap-2">
                      <label className={FIELD_LABEL}>Vehicle</label>
                      <input
                        name="carDescription"
                        defaultValue={editTarget?.carDescription ?? ""}
                        placeholder="Car Description — e.g. White Corolla GLi"
                        className={INPUT}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          name="make"
                          defaultValue={editTarget?.make ?? ""}
                          placeholder="Make"
                          className={INPUT}
                        />
                        <input
                          name="model"
                          defaultValue={editTarget?.model ?? ""}
                          placeholder="Model"
                          className={INPUT}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          name="engineNo"
                          defaultValue={editTarget?.engineNo ?? ""}
                          placeholder="Engine Number"
                          className={MONO_INPUT}
                        />
                        <input
                          name="chassisNo"
                          defaultValue={editTarget?.chassisNo ?? ""}
                          placeholder="Chassis Number"
                          className={MONO_INPUT}
                        />
                      </div>
                      <input
                        name="colour"
                        defaultValue={editTarget?.colour ?? ""}
                        placeholder="Colour"
                        className={INPUT}
                      />
                    </div>

                    {/* Device reference — plain text kept on the installation, not linked to Stock */}
                    <div className="flex flex-col gap-2">
                      <label className={FIELD_LABEL}>Device reference</label>
                      <div className="grid grid-cols-2 gap-2">
                        <PhoneInput
                          name="gsmNo"
                          defaultValue={editTarget?.gsmNo ?? ""}
                          placeholder="GSM Number"
                          className={MONO_INPUT}
                        />
                        <input
                          name="fmModule"
                          defaultValue={editTarget?.fmModule ?? ""}
                          placeholder="FM Module"
                          className={MONO_INPUT}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          name="cutOff"
                          defaultValue={editTarget?.cutOff ?? ""}
                          placeholder="Cut Off"
                          className={MONO_INPUT}
                        />
                        <input
                          name="imeiNo"
                          defaultValue={editTarget?.imeiNo ?? ""}
                          placeholder="IMEI Number"
                          className={MONO_INPUT}
                        />
                      </div>
                      <p className="text-[12px] text-text-muted">
                        Kept as notes on this installation — Stock and the fitted device above are
                        not affected
                      </p>
                    </div>
                  </div>
                )}
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
                {isEdit ? "Save changes" : "Save installation"}
              </SubmitButton>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
