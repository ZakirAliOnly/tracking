"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Package, Plus, MoreHorizontal } from "lucide-react";
import { AddDeviceModal, type SupplierOption } from "@/components/stock/AddDeviceModal";
import { EditDeviceModal, type EditDeviceTarget } from "@/components/stock/EditDeviceModal";
import { Pagination } from "@/components/ui/Pagination";
import { buildHref } from "@/lib/pagination";

export type DeviceStatus = "in_stock" | "faulty" | "returned";

export type DeviceRow = {
  id: string;
  fmModule: string | null;
  supplierName: string | null;
  quantity: number;
  costPrice: string | null;
  salePrice: string | null;
  status: DeviceStatus;
};

export type StockStats = {
  inStock: number;
  faulty: number;
  returned: number;
};

type Filter = "all" | "in_stock" | "faulty" | "returned";

type Props = {
  devices: DeviceRow[];
  stats: StockStats;
  suppliers: SupplierOption[];
  filter: Filter;
  page: number;
  total: number;
  searchParams: Record<string, string | undefined>;
};
const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  in_stock: "In stock",
  faulty: "Faulty",
  returned: "Returned",
};

function fmtRs(v: string | null) {
  if (!v || parseFloat(v) === 0) return "—";
  return `Rs ${Math.round(parseFloat(v)).toLocaleString("en-PK")}`;
}

function StatusBadge({ status }: { status: DeviceStatus }) {
  const map: Record<DeviceStatus, { label: string; cls: string }> = {
    in_stock: { label: "In stock", cls: "bg-accent-light text-accent" },
    faulty: { label: "Faulty", cls: "bg-error-light text-error-foreground" },
    returned: { label: "Returned", cls: "bg-surface-tertiary text-text-secondary" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-surface-tertiary text-text-secondary" };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
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

export function StockView({ devices, stats, suppliers, filter, page, total, searchParams }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EditDeviceTarget | null>(null);

  const handleEdit = useCallback((row: DeviceRow) => {
    setEditTarget({
      id: row.id,
      fmModule: row.fmModule,
      costPrice: row.costPrice,
      salePrice: row.salePrice,
      status: row.status,
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
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center rounded-[9px] border border-border bg-surface p-1">
          {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
            <Link
              key={f}
              href={buildHref("/stock", searchParams, { status: f === "all" ? undefined : f })}
              className={`rounded-[7px] px-3.5 py-1.5 text-[13px] transition-colors ${
                filter === f
                  ? "bg-text-primary font-semibold text-white"
                  : "font-medium text-text-secondary hover:text-text-primary"
              }`}
            >
              {FILTER_LABELS[f]}
            </Link>
          ))}
        </div>

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
        <StatCard label="In stock" value={stats.inStock} />
        <StatCard label="Faulty" value={stats.faulty} accent={stats.faulty > 0 ? "text-error" : undefined} />
        <StatCard label="Returned" value={stats.returned} />
      </div>

      {/* Table */}
      <div
        className="rounded-[20px] border border-border bg-surface"
        style={{ boxShadow: "0 1px 2px rgba(26,20,20,0.05), 0 6px 22px -8px rgba(26,20,20,0.14)" }}
      >
        {devices.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Device name", "Supplier", "Qty", "Cost price", "Sale price", "Status", ""].map((h) => (
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
                  <td className="px-4 py-4">
                    <StatusBadge status={device.status} />
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

function EmptyState({ filter }: { filter: Filter }) {
  const messages: Record<Filter, { title: string; sub: string }> = {
    all: { title: "No devices yet", sub: "Add your first device to get started." },
    in_stock: { title: "No devices in stock", sub: "Add a device or receive stock via a supplier invoice." },
    faulty: { title: "No faulty devices", sub: "No devices are marked as faulty." },
    returned: { title: "No returned devices", sub: "Returned devices will appear here." },
  };
  const { title, sub } = messages[filter];
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-accent-light">
        <Package className="h-7 w-7 text-accent" />
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold text-text-primary">{title}</p>
        <p className="mt-1 text-[13px] text-text-secondary">{sub}</p>
      </div>
    </div>
  );
}
