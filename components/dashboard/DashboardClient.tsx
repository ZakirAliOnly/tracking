"use client";

import { useState, useTransition } from "react";
import {
  Monitor, DollarSign, RefreshCw, Package,
  Plus, CheckCircle, Clock,
} from "lucide-react";
import {
  ResponsiveContainer, ComposedChart, Area, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { fetchDashboardData, type DashboardData, type Period } from "@/actions/dashboard";
import Link from "next/link";

/* ─── Helpers ────────────────────────────────────────────────── */

function fmtRs(v: number) {
  if (v >= 1_000_000) return `Rs ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `Rs ${Math.round(v / 1000)}K`;
  return `Rs ${Math.round(v).toLocaleString()}`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PK", { day: "2-digit", month: "short" });
}
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/* ─── Sparkline ─────────────────────────────────────────────── */

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const w = 80, h = 36;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - 4 - ((v - min) / range) * (h - 8);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  // Build a smooth path using simple cubic beziers
  const pathD = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt}`;
    const [x1, y1] = pts[i - 1].split(",").map(Number);
    const [x2, y2] = pt.split(",").map(Number);
    const cx = (x1 + x2) / 2;
    return `${acc} C ${cx},${y1} ${cx},${y2} ${x2},${y2}`;
  }, "");

  return (
    <svg width={w} height={h} className="overflow-visible flex-none">
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Custom chart tooltip ───────────────────────────────────── */

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[10px] border border-border bg-surface px-3 py-2 shadow-lg">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-text-muted">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} className="text-[13px] font-semibold" style={{ color: p.color }}>
          {p.name}: {fmtRs(p.value)}
        </p>
      ))}
    </div>
  );
}

/* ─── KPI card ───────────────────────────────────────────────── */

type KpiColor = "accent" | "success" | "warning" | "violet";

const KPI_ICON_CLASS: Record<KpiColor, string> = {
  accent: "bg-accent-light text-accent",
  success: "bg-success-light text-success-foreground",
  warning: "bg-warning-light text-warning-foreground",
  violet: "bg-violet-light text-violet-foreground",
};

const KPI_SPARKLINE_COLOR: Record<KpiColor, string> = {
  accent: "var(--color-accent)",
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  violet: "var(--color-violet)",
};

// Static decorative sparkline patterns per card
const SPARKLINE_DATA: Record<KpiColor, number[]> = {
  accent:  [3, 5, 4, 7, 6, 8, 9, 10, 8, 12],
  success: [4, 3, 5, 6, 5, 8, 7, 9, 11, 10],
  warning: [6, 7, 5, 4, 6, 3, 5, 4, 6, 5],
  violet:  [8, 6, 7, 9, 8, 7, 9, 10, 9, 11],
};

function KpiCard({
  icon: Icon,
  label,
  value,
  color,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: KpiColor;
  badge?: React.ReactNode;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[20px] border border-border bg-surface p-5"
      style={{ boxShadow: "0 1px 2px rgba(15,27,45,0.05), 0 6px 22px -8px rgba(15,27,45,0.14)" }}
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] ${KPI_ICON_CLASS[color]}`}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
        {badge}
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <p className="font-display text-[25px] font-bold leading-7 text-text-primary">{value}</p>
          <p className="mt-1 text-[12.5px] text-text-secondary">{label}</p>
        </div>
        <Sparkline values={SPARKLINE_DATA[color]} color={KPI_SPARKLINE_COLOR[color]} />
      </div>
    </div>
  );
}

function TrendBadge({ value, type }: { value: number; type: "up" | "down" | "due" }) {
  if (type === "due") {
    return (
      <span className="inline-flex items-center rounded-full bg-warning-light px-2 py-0.5 text-[11.5px] font-semibold text-warning-foreground">
        {value} due
      </span>
    );
  }
  if (type === "up") {
    return (
      <span className="inline-flex items-center rounded-full bg-success-lightest px-2 py-0.5 text-[11.5px] font-semibold text-success-dark">
        +{value}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-error-light px-2 py-0.5 text-[11.5px] font-semibold text-error-foreground">
      −{value}
    </span>
  );
}

/* ─── Vehicle makes bar ──────────────────────────────────────── */

const MAKE_COLORS = [
  "var(--color-accent)",
  "var(--color-success)",
  "var(--color-violet)",
  "var(--color-warning)",
  "var(--color-text-muted)",
];

/* ─── Status badge ───────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-success-light text-success-foreground",
    inactive: "bg-surface-tertiary text-text-secondary",
    suspended: "bg-error-light text-error-foreground",
  };
  return (
    <span className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold capitalize ${map[status] ?? map.inactive}`}>
      {status}
    </span>
  );
}

/* ─── Activity icon ──────────────────────────────────────────── */

function ActivityIcon({ type }: { type: DashboardData["activity"][0]["type"] }) {
  if (type === "installation") {
    return (
      <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-accent-light">
        <Plus className="h-4 w-4 text-accent" />
      </div>
    );
  }
  if (type === "renewal") {
    return (
      <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-success-light">
        <CheckCircle className="h-4 w-4 text-success-foreground" />
      </div>
    );
  }
  return (
    <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] bg-warning-light">
      <Clock className="h-4 w-4 text-warning-foreground" />
    </div>
  );
}

/* ─── Period tabs ────────────────────────────────────────────── */

const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "month", label: "This month" },
  { id: "quarter", label: "Quarter" },
  { id: "year", label: "Year" },
];

/* ─── Main component ─────────────────────────────────────────── */

export function DashboardClient({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState<DashboardData>(initialData);
  const [isPending, startTransition] = useTransition();

  const handlePeriod = (p: Period) => {
    startTransition(async () => {
      const fresh = await fetchDashboardData(p);
      if (fresh) setData(fresh);
    });
  };

  const { kpi, chartData, vehicleMakes, recentInstallations, activity } = data;

  return (
    <div className={`space-y-5 transition-opacity ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between">
        {/* Period tabs */}
        <div className="flex items-center gap-1 rounded-[9px] border border-border bg-surface p-1"
          style={{ boxShadow: "0 1px 2px rgba(15,27,45,0.05)" }}>
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => handlePeriod(p.id)}
              className={`rounded-[7px] px-3.5 py-1.5 text-[13px] font-medium transition-all ${
                data.period === p.id
                  ? "bg-text-primary text-white font-semibold shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
<Link
            href="/installations"
            className="flex h-9 items-center gap-2 rounded-[9px] bg-accent px-4 text-[13px] font-semibold text-accent-foreground transition-opacity hover:opacity-90"
            style={{ boxShadow: "0 8px 18px -6px rgba(45,107,255,0.5)" }}
          >
            <Plus className="h-3.5 w-3.5" />
            New installation
          </Link>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard
          icon={Monitor}
          label="Active installations"
          value={String(kpi.activeInstallations)}
          color="accent"
          badge={<TrendBadge value={kpi.activeInstallations} type="up" />}
        />
        <KpiCard
          icon={DollarSign}
          label={`Revenue — ${PERIODS.find(p => p.id === data.period)?.label}`}
          value={fmtRs(kpi.revenue)}
          color="success"
          badge={kpi.revenue > 0 ? <TrendBadge value={9} type="up" /> : undefined}
        />
        <KpiCard
          icon={RefreshCw}
          label="Renewals due (30d)"
          value={String(kpi.renewalsDue30d)}
          color="warning"
          badge={<TrendBadge value={kpi.renewalsDue30d} type="due" />}
        />
        <KpiCard
          icon={Package}
          label="Devices in stock"
          value={String(kpi.stockCount)}
          color="violet"
          badge={<TrendBadge value={kpi.stockCount} type="up" />}
        />
      </div>

      {/* ── Chart + Vehicle makes ── */}
      <div className="grid grid-cols-3 gap-4">
        {/* Revenue & renewals chart */}
        <div
          className="col-span-2 rounded-[20px] border border-border bg-surface p-5"
          style={{ boxShadow: "0 1px 2px rgba(15,27,45,0.05), 0 6px 22px -8px rgba(15,27,45,0.14)" }}
        >
          <div className="mb-4 flex items-start justify-between">
            <div>
              <p className="font-display text-[15px] font-semibold text-text-primary">Revenue &amp; renewals</p>
              <p className="text-[12px] text-text-muted">Installations vs renewal income</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                <span className="text-[12px] text-text-muted">Installations</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-success" />
                <span className="text-[12px] text-text-muted">Renewals</span>
              </div>
            </div>
          </div>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="installGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="0"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "var(--color-text-muted)", fontFamily: "Inter" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "var(--color-text-muted)", fontFamily: "Inter" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}K` : String(v)}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="installs"
                  name="Installations"
                  stroke="var(--color-accent)"
                  strokeWidth={3}
                  fill="url(#installGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: "var(--color-accent)" }}
                />
                <Line
                  type="monotone"
                  dataKey="renewals"
                  name="Renewals"
                  stroke="var(--color-success)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: "var(--color-success)" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top vehicle makes */}
        <div
          className="rounded-[20px] border border-border bg-surface p-5"
          style={{ boxShadow: "0 1px 2px rgba(15,27,45,0.05), 0 6px 22px -8px rgba(15,27,45,0.14)" }}
        >
          <p className="font-display text-[15px] font-semibold text-text-primary">Top vehicle makes</p>
          <p className="text-[12px] text-text-muted">Installed fleet by make</p>
          <div className="mt-5 flex flex-col gap-4">
            {vehicleMakes.length === 0 ? (
              <p className="text-[13px] text-text-muted">No data yet</p>
            ) : (
              vehicleMakes.map((row, i) => (
                <div key={row.make}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[13px] font-medium text-text-primary">{row.make}</span>
                    <span className="font-mono text-[12.5px] font-semibold text-text-secondary">{row.pct}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-border-light">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${row.pct}%`, backgroundColor: MAKE_COLORS[i % MAKE_COLORS.length] }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Recent installations + Activity ── */}
      <div className="grid grid-cols-3 gap-4 pb-2">
        {/* Recent installations */}
        <div
          className="col-span-2 rounded-[20px] border border-border bg-surface"
          style={{ boxShadow: "0 1px 2px rgba(15,27,45,0.05), 0 6px 22px -8px rgba(15,27,45,0.14)" }}
        >
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="font-display text-[15px] font-semibold text-text-primary">Recent installations</p>
              <p className="text-[12px] text-text-muted">Latest devices fitted</p>
            </div>
            <Link href="/installations" className="text-[12px] font-semibold text-accent hover:opacity-80 transition-opacity">
              View all
            </Link>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-y border-border bg-surface-muted">
                {["Client", "Vehicle", "Reg No", "Total", "Status"].map(h => (
                  <th key={h} className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted first:pl-5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentInstallations.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-[13px] text-text-muted">No installations yet</td></tr>
              ) : (
                recentInstallations.map((row, i) => (
                  <tr key={row.id} className={`transition-colors hover:bg-surface-muted ${i < recentInstallations.length - 1 ? "border-b border-border" : ""}`}>
                    <td className="px-5 py-3 text-[13px] font-semibold text-text-primary">{row.customer}</td>
                    <td className="px-5 py-3 text-[13px] text-text-secondary">{row.vehicle}</td>
                    <td className="px-5 py-3 font-mono text-[12px] text-text-muted">{row.regNo}</td>
                    <td className="px-5 py-3 font-mono text-[13px] font-medium text-text-primary">{fmtRs(row.total)}</td>
                    <td className="px-5 py-3"><StatusBadge status={row.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Activity feed */}
        <div
          className="rounded-[20px] border border-border bg-surface p-5"
          style={{ boxShadow: "0 1px 2px rgba(15,27,45,0.05), 0 6px 22px -8px rgba(15,27,45,0.14)" }}
        >
          <p className="font-display text-[15px] font-semibold text-text-primary">Activity</p>
          <p className="text-[12px] text-text-muted">Latest events</p>
          <div className="mt-4 flex flex-col gap-4">
            {activity.length === 0 ? (
              <p className="text-[13px] text-text-muted">No recent activity</p>
            ) : (
              activity.map((item, i) => (
                <div key={item.id} className={`flex items-start gap-3 ${i < activity.length - 1 ? "pb-4 border-b border-border" : ""}`}>
                  <ActivityIcon type={item.type} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-text-primary leading-[1.3]">{item.label}</p>
                    <p className="mt-0.5 truncate text-[12px] text-text-muted">{item.sub}</p>
                    {item.amount > 0 && (
                      <p className="mt-0.5 font-mono text-[12px] font-semibold text-accent">{fmtRs(item.amount)}</p>
                    )}
                  </div>
                  <span className="flex-none text-[11px] text-text-muted">{timeAgo(item.time)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
