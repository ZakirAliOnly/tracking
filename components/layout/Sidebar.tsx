"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/actions/auth";
import { SubmitButton } from "@/components/ui/SubmitButton";
import {
  LayoutDashboard,
  Wrench,
  RefreshCw,
  Package,
  Truck,
  CreditCard,
  Receipt,
  BarChart2,
  TrendingUp,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/installations", label: "Installations", icon: Wrench },
      { href: "/renewals", label: "Renewals", icon: RefreshCw },
      { href: "/sales-report", label: "Sales Report", icon: TrendingUp },
    ],
  },
  {
    label: "Inventory",
    items: [
      { href: "/stock", label: "Stock", icon: Package },
      { href: "/suppliers", label: "Suppliers", icon: Truck },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/payment-methods", label: "Payment Methods", icon: CreditCard },
      { href: "/expenses", label: "Expenses", icon: Receipt },
      { href: "/reports", label: "Reports", icon: BarChart2 },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-60 flex-none flex-col bg-surface border-r border-border">
      {/* Logo — the org's own logo image carries the name, so no separate
          text label sits next to it */}
      <div className="flex items-center px-5 py-3 border-b border-border">
        <Image src="/logo.jpeg" alt="Real Tracker" width={200} height={200} className="h-16 w-auto" priority />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-6">
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              {group.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));

                return (
                  <li key={item.href} className="relative">
                    {isActive && (
                      <div className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-accent" />
                    )}
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-[9px] px-3 py-2 text-[14px] transition-colors",
                        isActive
                          ? "bg-accent-light text-accent-dark font-semibold"
                          : "text-text-secondary font-medium hover:bg-surface-tertiary hover:text-text-primary"
                      )}
                    >
                      <item.icon className="h-4 w-4 flex-none" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User card */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 flex-none items-center justify-center rounded-[9px] text-[12px] font-bold font-display text-accent-foreground"
            style={{
              background: "linear-gradient(135deg, #E11D48 0%, #B0123A 100%)",
            }}
          >
            A
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-text-primary">
              Admin User
            </p>
            <p className="truncate text-[12px] text-text-muted">Owner</p>
          </div>
          <form action={logoutAction}>
            <SubmitButton
              pendingLabel=""
              spinnerClassName="h-4 w-4"
              className="flex-none text-text-muted hover:text-text-primary transition-colors disabled:opacity-60"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </SubmitButton>
          </form>
        </div>
      </div>
    </aside>
  );
}
