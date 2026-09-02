"use client";

import { ChevronDown } from "lucide-react";
import { salePriceOf, type InstallableDevice } from "@/lib/device-options";

type Props = {
  simId: string;
  devices: InstallableDevice[];
  onChange: (simId: string) => void;
  labelClassName: string;
  selectClassName: string;
};

/** "Rs 2,300", "No sale price set", or "—" with nothing picked. */
export function simAmountOf(simId: string, devices: InstallableDevice[]): number {
  const sim = devices.find((d) => d.id === simId);
  return sim ? salePriceOf(sim) : 0;
}

/** Single-select Sim picker — a Sim is one line, unlike Devices' repeatable list. */
export function SimPicker({ simId, devices, onChange, labelClassName, selectClassName }: Props) {
  const simOptions = devices.filter((d) => d.type === "sim");
  if (simOptions.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelClassName}>Sim</label>
      <div className="relative">
        <select
          value={simId}
          onChange={(e) => onChange(e.target.value)}
          className={selectClassName}
        >
          <option value="">No sim for this installation</option>
          {simOptions.map((s) => (
            <option key={s.id} value={s.id} disabled={s.quantity < 1}>
              {s.name} · {s.salePrice ? `Rs ${Math.round(parseFloat(s.salePrice)).toLocaleString("en-PK")}` : "no price set"} · {s.quantity < 1 ? "no stock available" : `${s.quantity} in stock`}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      </div>
    </div>
  );
}
