"use client";

import { ChevronDown, X } from "lucide-react";
import {
  DeviceLines,
  deviceSubtotal,
  newDeviceLine,
  type DeviceLineDraft,
} from "@/components/installations/DeviceLines";
import { PaymentSummary } from "@/components/installations/PaymentSummary";
import { PhoneInput } from "@/components/ui/PhoneInput";
import type { AccountOption } from "@/lib/accounts";
import type { InstallableDevice } from "@/lib/device-options";
import { resolvePayment, type DiscountMode } from "@/lib/installation-money";

export type InstallationDraft = {
  key: number;
  registrationNo: string;
  installationDate: string;
  deviceLines: DeviceLineDraft[];
  amountOverride: string | null;
  simPayment: string;
  simNo: string;
  discountMode: DiscountMode;
  discountValue: string;
  amountPaid: string;
  accountId: string;
};

export function newInstallationDraft(key: number, installationDate: string): InstallationDraft {
  return {
    key,
    registrationNo: "",
    installationDate,
    deviceLines: [newDeviceLine(1)],
    amountOverride: null,
    simPayment: "",
    simNo: "",
    discountMode: "fixed",
    discountValue: "",
    amountPaid: "",
    accountId: "",
  };
}

/** What the draft resolves to for the Amount box and the payload sent to the server. */
export function resolvedAmount(draft: InstallationDraft, devices: InstallableDevice[]): string {
  const subtotal = deviceSubtotal(draft.deviceLines, devices);
  return draft.amountOverride ?? (subtotal > 0 ? String(subtotal) : "");
}

type Props = {
  index: number;
  draft: InstallationDraft;
  onChange: (patch: Partial<InstallationDraft>) => void;
  onRemove: () => void;
  removable: boolean;
  devices: InstallableDevice[];
  accounts: AccountOption[];
  labelClassName: string;
  inputClassName: string;
  monoInputClassName: string;
  selectClassName: string;
};

export function InstallationBlockFields({
  index,
  draft,
  onChange,
  onRemove,
  removable,
  devices,
  accounts,
  labelClassName,
  inputClassName,
  monoInputClassName,
  selectClassName,
}: Props) {
  const amountValue = resolvedAmount(draft, devices);

  const money = resolvePayment({
    amount: parseFloat(amountValue) || 0,
    simPayment: parseFloat(draft.simPayment) || 0,
    discountMode: draft.discountMode,
    discountValue: parseFloat(draft.discountValue) || 0,
    amountPaid: parseFloat(draft.amountPaid) || 0,
  });

  // Mirrors the Server Action: a method is only needed when money actually
  // moved — something paid, against a job worth something
  const hasPaid = money.total > 0 && money.amountPaid > 0;

  return (
    <div className="flex flex-col gap-5 rounded-[12px] border border-border bg-surface px-4 py-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-text-muted">
          Installation {index + 1}
        </p>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Remove installation"
            className="flex h-7 w-7 items-center justify-center rounded-[8px] text-text-muted transition-colors hover:bg-error-light hover:text-error"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelClassName}>
            Registration No <span className="text-error">*</span>
          </label>
          <input
            value={draft.registrationNo}
            onChange={(e) => onChange({ registrationNo: e.target.value })}
            placeholder="BHN-058"
            required
            className={monoInputClassName}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClassName}>
            Installetion Date <span className="text-error">*</span>
          </label>
          <input
            type="date"
            value={draft.installationDate}
            onChange={(e) => onChange({ installationDate: e.target.value })}
            required
            className={inputClassName}
          />
        </div>
      </div>

      <DeviceLines
        lines={draft.deviceLines}
        devices={devices}
        onChange={(deviceLines) => onChange({ deviceLines })}
        labelClassName={labelClassName}
        inputClassName={inputClassName}
        selectClassName={selectClassName}
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelClassName}>Amount</label>
          <input
            type="number"
            min="0"
            step="any"
            placeholder="0"
            value={amountValue}
            onChange={(e) => onChange({ amountOverride: e.target.value })}
            className={inputClassName}
          />
          <p className="text-[12px] text-text-muted">
            {draft.amountOverride === null ? "From the devices — you can change it" : "Changed by hand"}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClassName}>Sim</label>
          <input
            type="number"
            min="0"
            step="any"
            placeholder="0"
            value={draft.simPayment}
            onChange={(e) => onChange({ simPayment: e.target.value })}
            className={inputClassName}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClassName}>Sim Number</label>
        <PhoneInput
          value={draft.simNo}
          onChange={(simNo) => onChange({ simNo })}
          className={monoInputClassName}
        />
        <p className="text-[12px] text-text-muted">11 digits, or leave blank</p>
      </div>

      {accounts.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className={labelClassName}>
            Payment Method {hasPaid && <span className="text-error">*</span>}
          </label>
          <div className="relative">
            <select
              value={draft.accountId}
              onChange={(e) => onChange({ accountId: e.target.value })}
              required={hasPaid}
              className={selectClassName}
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
            {hasPaid ? "Where this money landed" : "Needed once an Amount paid is entered"}
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelClassName}>Discount</label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="any"
              placeholder="0"
              value={draft.discountValue}
              onChange={(e) => onChange({ discountValue: e.target.value })}
              className={inputClassName + " w-full"}
            />
            <div className="relative flex-none">
              <select
                value={draft.discountMode}
                onChange={(e) => onChange({ discountMode: e.target.value as DiscountMode })}
                className={selectClassName + " w-[74px]"}
              >
                <option value="fixed">Rs</option>
                <option value="percent">%</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClassName}>Amount paid</label>
          <input
            type="number"
            min="0"
            step="any"
            placeholder="0"
            value={draft.amountPaid}
            onChange={(e) => onChange({ amountPaid: e.target.value })}
            className={inputClassName}
          />
        </div>
      </div>

      {money.total > 0 && <PaymentSummary money={money} />}
    </div>
  );
}
