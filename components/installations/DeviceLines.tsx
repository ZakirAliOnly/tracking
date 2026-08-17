"use client";

import { ChevronDown, Plus, X } from "lucide-react";
import {
  deviceLabel,
  salePriceOf,
  type InstallableDevice,
} from "@/lib/device-options";

export type DeviceLineDraft = { key: number; deviceId: string; quantity: string };

export function newDeviceLine(key: number): DeviceLineDraft {
  return { key, deviceId: "", quantity: "1" };
}

/** What the picked devices come to, before any hand-typed override. */
export function deviceSubtotal(
  lines: DeviceLineDraft[],
  devices: InstallableDevice[]
): number {
  return lines.reduce((sum, line) => {
    const device = devices.find((d) => d.id === line.deviceId);
    if (!device) return sum;
    return sum + salePriceOf(device) * (parseInt(line.quantity, 10) || 0);
  }, 0);
}

type Props = {
  lines: DeviceLineDraft[];
  devices: InstallableDevice[];
  onChange: (lines: DeviceLineDraft[]) => void;
  labelClassName: string;
  inputClassName: string;
  selectClassName: string;
};

export function DeviceLines({
  lines,
  devices,
  onChange,
  labelClassName,
  inputClassName,
  selectClassName,
}: Props) {
  if (devices.length === 0) return null;

  const update = (key: number, patch: Partial<DeviceLineDraft>) =>
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const add = () => onChange([...lines, newDeviceLine(Math.max(...lines.map((l) => l.key), 0) + 1)]);

  const remove = (key: number) => onChange(lines.filter((l) => l.key !== key));

  return (
    <div className="flex flex-col gap-2">
      <label className={labelClassName}>
        Devices <span className="text-error">*</span>
      </label>

      {lines.map((line, i) => (
        <div key={line.key} className="flex items-start gap-2">
          <div className="relative flex-1">
            <select
              name="deviceId"
              value={line.deviceId}
              onChange={(e) => update(line.key, { deviceId: e.target.value })}
              required={i === 0}
              className={selectClassName}
            >
              <option value="">Choose a device from stock</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id} disabled={d.quantity < 1}>
                  {deviceLabel(d)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          </div>

          <input
            name="deviceQuantity"
            type="number"
            min="1"
            step="1"
            value={line.quantity}
            onChange={(e) => update(line.key, { quantity: e.target.value })}
            aria-label="Quantity"
            className={inputClassName + " w-[68px] flex-none text-center"}
          />

          <button
            type="button"
            onClick={() => remove(line.key)}
            disabled={lines.length === 1}
            aria-label="Remove device"
            className="flex h-10 w-9 flex-none items-center justify-center rounded-[9px] text-text-muted transition-colors hover:bg-error-light hover:text-error disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-text-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="flex h-9 w-fit items-center gap-1.5 rounded-[9px] border border-border bg-surface px-3 text-[13px] font-medium text-text-secondary transition-colors hover:border-accent hover:text-accent"
      >
        <Plus className="h-3.5 w-3.5" />
        Add another device
      </button>
    </div>
  );
}
