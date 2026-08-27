"use client";

import { useCallback, useState } from "react";
import { Package, Plus, MoreHorizontal } from "lucide-react";
import { AddDeviceModal, type SupplierOption } from "@/components/stock/AddDeviceModal";
import { EditDeviceModal, type EditDeviceTarget } from "@/components/stock/EditDeviceModal";
import { Pagination } from "@/components/ui/Pagination";

export type StockType = "device" | "sim";

export type DeviceRow = {
  id: string;
  fmModule: string | null;
  type: StockType;
  supplierName: string | null;
  quantity: number;
  costPrice: string | null;
  salePrice: string | null;
};

export type StockStats = {
  /** Units in the org's one Device pool. */
  deviceUnits: number;
  /** Units in the org's one Sim pool. */
  simUnits: number;
  /** How many distinct stock lines make up those totals. */
  lines: number;
};

function TypeBadge({ type }: { type: StockType }) {
  return type === "sim" ? (
    <span className="inline-flex rounded-full bg-accent-light px-2.5 py-1 text-xs font-semibold text-accent">
      Sim
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-surface-tertiary px-2.5 py-1 text-xs font-semibold text-text-secondary">
      Device
    </span>
  );
}

type Props = {
  devices: DeviceRow[];
  stats: StockStats;
  suppliers: SupplierOption[];
  page: number;
  total: number;
  searchParams: Record<string, string | undefined>;
};

function fmtRs(v: string | null) {
  if (!v || parseFloat(v) === 0) return "—";
  return `Rs ${Math.round(parseFloat(v)).toLocaleString("en-PK")}`;
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div
      className="flex flex-col gap-1 rounded-[16px] border border-border bg-surface px-6 py-5"
      style={{ boxShadow: "0 1px 2px rgba(26,20,20,0.05), 0 4px 16px -8px rgba(26,20,20,0.10)" }}
    >
      <p className="text-[13px] font-medium text-text-secondary">{label}</p>
      <p className={`font-display text-[32px] font-bold leading-9 ${accent ?? "text-text-primary"}`}>
        {value}
      </p>
    </div>
  );
}

export function StockView({ devices, stats, suppliers, page, total, searchParams }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EditDeviceTarget | null>(null);

  const handleEdit = useCallback((row: DeviceRow) => {
    setEditTarget({
      id: row.id,
      fmModule: row.fmModule,
      type: row.type,
      costPrice: row.costPrice,
      salePrice: row.salePrice,
    });
  }, []);

  const handleCloseEdit = useCallback(() => setEditTarget(null), []);

  return (
    <>
      <AddDeviceModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        suppliers={suppliers}
      />

      <EditDeviceModal
        open={!!editTarget}
        onClose={handleCloseEdit}
        device={editTarget}
      />

      {/* Toolbar */}
      <div className="mb-5 flex items-center justify-end">
        <button
          onClick={() => setAddOpen(true)}
          className="flex h-9 items-center gap-2 rounded-[9px] bg-accent px-4 text-[13px] font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          style={{ boxShadow: "0 1px 2px rgba(225,29,72,0.20), 0 4px 12px -4px rgba(225,29,72,0.40)" }}
        >
          <Plus className="h-4 w-4" />
          Add device
        </button>
      </div>

      {/* Stats cards */}
      <div className="mb-5 grid grid-cols-3 gap-4">
        <StatCard label="Device units" value={stats.deviceUnits} />
        <StatCard label="Sim units" value={stats.simUnits} />
        <StatCard label="Stock lines" value={stats.lines} />
      </div>

      {/* Table */}
      <div
        className="rounded-[20px] border border-border bg-surface"
        style={{ boxShadow: "0 1px 2px rgba(26,20,20,0.05), 0 6px 22px -8px rgba(26,20,20,0.14)" }}
      >
        {devices.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Device name", "Type", "Supplier", "Qty", "Cost price", "Sale price", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted first:pl-5"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {devices.map((device, i) => (
                <tr
                  key={device.id}
                  className={`transition-colors hover:bg-surface-muted ${
                    i < devices.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <td className="pl-5 pr-4 py-4">
                    <span className="text-[14px] font-semibold text-text-primary">
                      {device.fmModule ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <TypeBadge type={device.type} />
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-[13px] text-text-secondary">
                      {device.supplierName ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`font-display text-[15px] font-bold ${device.quantity === 0 ? "text-text-muted" : "text-text-primary"}`}>
                      {device.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-[13px] font-medium text-text-primary">
                      {fmtRs(device.costPrice)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-[13px] font-medium text-text-primary">
                      {fmtRs(device.salePrice)}
                    </span>
                  </td>
                  <td className="pl-2 pr-5 py-4">
                    <button
                      onClick={() => handleEdit(device)}
                      className="flex h-8 w-8 items-center justify-center rounded-[9px] text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary"
                      aria-label="Edit device"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {total > 0 && (
          <Pagination page={page} total={total} label="device" basePath="/stock" searchParams={searchParams} />
        )}
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-accent-light">
        <Package className="h-7 w-7 text-accent" />
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold text-text-primary">Nothing in stock</p>
        <p className="mt-1 text-[13px] text-text-secondary">
          Add a device, or receive stock through a supplier invoice.
        </p>
      </div>
    </div>
  );
}
