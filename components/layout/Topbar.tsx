"use client";

import { usePathname } from "next/navigation";

type PageMeta = {
  title: string;
  subtitle: string;
};

const PAGE_META: Record<string, PageMeta> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Overview of your tracking operations",
  },
  "/customers": {
    title: "Customers",
    subtitle: "Manage your client accounts",
  },
  "/installations": {
    title: "Installations",
    subtitle: "GPS device installation records",
  },
  "/renewals": {
    title: "Renewals",
    subtitle: "Track and manage subscription renewals",
  },
  "/stock": {
    title: "Stock",
    subtitle: "Device and SIM inventory",
  },
  "/suppliers": {
    title: "Suppliers",
    subtitle: "Device and SIM suppliers",
  },
  "/payment-methods": {
    title: "Payment Methods",
    subtitle: "Manage payment accounts",
  },
  "/expenses": {
    title: "Expenses",
    subtitle: "Track business expenses",
  },
  "/reports": {
    title: "Reports",
    subtitle: "Analytics and financial reports",
  },
};

export function Topbar() {
  const pathname = usePathname();
  const segment = `/${pathname.split("/")[1]}`;
  const meta: PageMeta = PAGE_META[segment] ?? {
    title: "Real Tracker",
    subtitle: "",
  };

  return (
    <header className="flex h-16 flex-none items-center border-b border-border bg-surface px-6">
      {/* Page title */}
      <div>
        <h1 className="font-display text-[20px] font-bold leading-7 text-text-primary">
          {meta.title}
        </h1>
        {meta.subtitle && (
          <p className="text-[13px] leading-4 text-text-secondary">
            {meta.subtitle}
          </p>
        )}
      </div>

    </header>
  );
}
