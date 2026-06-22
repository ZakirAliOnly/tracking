"use client";

import { useCallback, useState } from "react";
import { MoreHorizontal, Plus, BookOpen, CreditCard, Pencil, Users } from "lucide-react";
import Link from "next/link";
import { AddCustomerDrawer } from "@/components/customers/AddCustomerDrawer";

type CustomerStatus = "active" | "renewal_due" | "inactive";

export type CustomerRow = {
  id: string;
  name: string;
  phone: string;
  address: string | null;
  remarks: string | null;
  contactCount: number;
  vehicleCount: number;
  activeInstallCount: number;
  status: CustomerStatus;
};

type Props = {
  customers: CustomerRow[];
};

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #2D6BFF 0%, #5A8BFF 100%)",
  "linear-gradient(135deg, #13B981 0%, #34D399 100%)",
  "linear-gradient(135deg, #7C5CFC 0%, #A78BFA 100%)",
  "linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)",
  "linear-gradient(135deg, #EF4D5A 0%, #F87171 100%)",
  "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)",
];

function getGradient(name: string): string {
  const hash = name.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function StatusPill({ status }: { status: CustomerStatus }) {
  if (status === "active")
    return (
      <span className="inline-flex items-center rounded-full bg-success-light px-2.5 py-1 text-xs font-semibold text-success-foreground">
        Active
      </span>
    );
  if (status === "renewal_due")
    return (
      <span className="inline-flex items-center rounded-full bg-warning-light px-2.5 py-1 text-xs font-semibold text-warning-foreground">
        Renewal due
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full bg-surface-tertiary px-2.5 py-1 text-xs font-semibold text-text-secondary">
      Inactive
    </span>
  );
}

type Filter = "all" | "active" | "inactive";

export function CustomersView({ customers }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<CustomerRow | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditCustomer(null);
  }, []);

  const handleEdit = useCallback((customer: CustomerRow) => {
    setOpenDropdown(null);
    setEditCustomer(customer);
    setDrawerOpen(true);
  }, []);

  const filtered = customers.filter((c) => {
    if (filter === "active") return c.activeInstallCount > 0;
    if (filter === "inactive") return c.activeInstallCount === 0;
    return true;
  });

  return (
    <>
      <AddCustomerDrawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        customer={editCustomer}
      />

      {/* Transparent backdrop closes any open dropdown */}
      {openDropdown && (
        <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
      )}

      {/* Toolbar */}
      <div className="mb-5 flex items-center justify-between">
        {/* Segmented control */}
        <div className="flex items-center rounded-[9px] border border-border bg-surface p-1">
          {(["all", "active", "inactive"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-[7px] px-3.5 py-1.5 text-[13px] transition-colors ${
                filter === f
                  ? "bg-text-primary font-semibold text-white"
                  : "font-medium text-text-secondary hover:text-text-primary"
              }`}
            >
              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Add button */}
        <button
          onClick={() => {
            setEditCustomer(null);
            setDrawerOpen(true);
          }}
          className="flex h-9 items-center gap-2 rounded-[9px] bg-accent px-4 text-[13px] font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          style={{
            boxShadow: "0 1px 2px rgba(45,107,255,0.20), 0 4px 12px -4px rgba(45,107,255,0.40)",
          }}
        >
          <Plus className="h-4 w-4" />
          Add customer
        </button>
      </div>

      {/* Table card */}
      <div
        className="rounded-[20px] border border-border bg-surface"
        style={{
          boxShadow: "0 1px 2px rgba(15,27,45,0.05), 0 6px 22px -8px rgba(15,27,45,0.14)",
        }}
      >
        {filtered.length === 0 ? (
          <EmptyState
            filter={filter}
            onAdd={() => {
              setEditCustomer(null);
              setDrawerOpen(true);
            }}
          />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Customer
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Primary Contact
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Vehicles
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Active Installs
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Address
                </th>
                <th className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                  Status
                </th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer, i) => (
                <tr
                  key={customer.id}
                  className={`transition-colors hover:bg-surface-muted ${
                    i < filtered.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  {/* Customer */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[9px] font-display text-[12px] font-bold text-white"
                        style={{ background: getGradient(customer.name) }}
                      >
                        {getInitials(customer.name)}
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold leading-tight text-text-primary">
                          {customer.name}
                        </p>
                        <p className="mt-0.5 text-[12px] text-text-muted">
                          {customer.contactCount === 0
                            ? "No extra contacts"
                            : `${customer.contactCount} contact${customer.contactCount > 1 ? "s" : ""}`}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Phone */}
                  <td className="px-5 py-4">
                    <span className="font-mono text-[13px] text-text-primary">
                      {customer.phone}
                    </span>
                  </td>

                  {/* Vehicles */}
                  <td className="px-5 py-4">
                    <span className="text-[14px] text-text-primary">{customer.vehicleCount}</span>
                  </td>

                  {/* Active installs */}
                  <td className="px-5 py-4">
                    <span className="text-[14px] text-text-primary">
                      {customer.activeInstallCount}
                    </span>
                  </td>

                  {/* Address */}
                  <td className="px-5 py-4">
                    <span className="text-[13px] text-text-secondary">
                      {customer.address ?? "—"}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-4">
                    <StatusPill status={customer.status} />
                  </td>

                  {/* Row actions */}
                  <td className="px-4 py-4">
                    <div className="relative inline-block">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdown(
                            openDropdown === customer.id ? null : customer.id
                          );
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-[9px] text-text-muted transition-colors hover:bg-surface-tertiary hover:text-text-primary"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>

                      {openDropdown === customer.id && (
                        <div
                          className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-[12px] border border-border bg-surface py-1"
                          style={{
                            boxShadow:
                              "0 4px 6px -2px rgba(15,27,45,0.05), 0 12px 24px -4px rgba(15,27,45,0.12)",
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link
                            href={`/customers/${customer.id}`}
                            onClick={() => setOpenDropdown(null)}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-text-primary transition-colors hover:bg-surface-muted"
                          >
                            <BookOpen className="h-3.5 w-3.5 text-text-muted" />
                            View ledger
                          </Link>
                          <button
                            onClick={() => setOpenDropdown(null)}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-text-primary transition-colors hover:bg-surface-muted"
                          >
                            <CreditCard className="h-3.5 w-3.5 text-text-muted" />
                            Pay
                          </button>
                          <div className="my-1 border-t border-border" />
                          <button
                            onClick={() => handleEdit(customer)}
                            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium text-text-primary transition-colors hover:bg-surface-muted"
                          >
                            <Pencil className="h-3.5 w-3.5 text-text-muted" />
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function EmptyState({ filter, onAdd }: { filter: Filter; onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-accent-light">
        <Users className="h-7 w-7 text-accent" />
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold text-text-primary">
          {filter === "all" ? "No customers yet" : `No ${filter} customers`}
        </p>
        <p className="mt-1 text-[13px] text-text-secondary">
          {filter === "all"
            ? "Add your first customer to get started."
            : "Change the filter to see other customers."}
        </p>
      </div>
      {filter === "all" && (
        <button
          onClick={onAdd}
          className="flex h-9 items-center gap-2 rounded-[9px] bg-accent px-4 text-[13px] font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          style={{
            boxShadow: "0 1px 2px rgba(45,107,255,0.20), 0 4px 12px -4px rgba(45,107,255,0.40)",
          }}
        >
          <Plus className="h-4 w-4" />
          Add customer
        </button>
      )}
    </div>
  );
}
