"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type Period = "today" | "month" | "quarter" | "year";

export type ChartPoint = { month: string; installs: number; renewals: number };

export type DashboardData = {
  period: Period;
  kpi: {
    activeInstallations: number;
    revenue: number;
    renewalsDue30d: number;
    stockCount: number;
  };
  chartData: ChartPoint[];
  vehicleMakes: Array<{ make: string; count: number; pct: number }>;
  recentInstallations: Array<{
    id: string; customer: string; vehicle: string; regNo: string;
    total: number; date: string; status: string;
  }>;
  activity: Array<{
    id: string; type: "installation" | "renewal" | "renewal_due";
    label: string; sub: string; amount: number; time: string;
  }>;
};

function periodRange(period: Period): { start: Date; end: Date } {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();

  if (period === "today") {
    return { start: new Date(y, m, d), end: new Date(y, m, d, 23, 59, 59) };
  }
  if (period === "month") {
    return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0, 23, 59, 59) };
  }
  if (period === "quarter") {
    const qStart = Math.floor(m / 3) * 3;
    return { start: new Date(y, qStart, 1), end: new Date(y, qStart + 3, 0, 23, 59, 59) };
  }
  // year
  return { start: new Date(y, 0, 1), end: new Date(y, 11, 31, 23, 59, 59) };
}

export async function fetchDashboardData(period: Period = "month"): Promise<DashboardData | null> {
  try {
    const session = await auth();
    if (!session) return null;
    const { orgId } = session.user;

    const { start, end } = periodRange(period);
    const today = new Date();
    const in30d = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [
      activeInstallations,
      revenueAgg,
      renewalRevenueAgg,
      stockAgg,
      renewalsDueRaw,
      chartInstalls,
      chartRenewals,
      vehicleMakesRaw,
      recentInstalls,
      recentRenewals,
    ] = await Promise.all([
      // 1. Active installations
      prisma.installation.count({ where: { orgId, status: "active" } }),

      // 2. Revenue: installations in period
      prisma.installation.aggregate({
        where: { orgId, installationDate: { gte: start, lte: end } },
        _sum: { devicePayment: true },
      }),

      // 3. Revenue: renewals received in period
      prisma.renewal.aggregate({
        where: { orgId, received: true, renewedAt: { gte: start, lte: end } },
        _sum: { amount: true, simOsting: true, net: true, other: true },
      }),

      // 4. Stock count
      prisma.device.aggregate({
        where: { orgId, status: "in_stock" },
        _sum: { quantity: true },
      }),

      // 5. Renewals due in 30 days (using latest renewal's nextRenewalDate or installation's)
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT i.id)::bigint as count
        FROM installations i
        LEFT JOIN (
          SELECT installation_id, MAX(next_renewal_date) as latest
          FROM renewals
          WHERE org_id = ${orgId}
          GROUP BY installation_id
        ) r ON r.installation_id = i.id
        WHERE i.org_id = ${orgId}
          AND i.status = 'active'
          AND COALESCE(r.latest, i.next_renewal_date)
              BETWEEN ${today}::date AND ${in30d}::date
      `,

      // 6. Monthly install revenue — last 6 months
      prisma.$queryRaw<Array<{ month: string; revenue: number }>>`
        SELECT
          TO_CHAR(DATE_TRUNC('month', installation_date), 'Mon') AS month,
          DATE_TRUNC('month', installation_date) AS month_start,
          COALESCE(SUM(device_payment), 0)::float AS revenue
        FROM installations
        WHERE org_id = ${orgId}
          AND installation_date >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
        GROUP BY month_start, month
        ORDER BY month_start
      `,

      // 7. Monthly renewal revenue — last 6 months
      prisma.$queryRaw<Array<{ month: string; revenue: number }>>`
        SELECT
          TO_CHAR(DATE_TRUNC('month', renewed_at), 'Mon') AS month,
          DATE_TRUNC('month', renewed_at) AS month_start,
          COALESCE(SUM(amount + sim_osting + net + other), 0)::float AS revenue
        FROM renewals
        WHERE org_id = ${orgId}
          AND received = true
          AND renewed_at >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
        GROUP BY month_start, month
        ORDER BY month_start
      `,

      // 8. Top vehicle makes
      prisma.$queryRaw<Array<{ make: string; cnt: bigint }>>`
        SELECT v.make, COUNT(i.id)::bigint AS cnt
        FROM installations i
        JOIN vehicles v ON v.id = i.vehicle_id
        WHERE i.org_id = ${orgId}
          AND v.make IS NOT NULL AND v.make <> ''
        GROUP BY v.make
        ORDER BY cnt DESC
        LIMIT 6
      `,

      // 9. Recent installations
      prisma.installation.findMany({
        where: { orgId },
        orderBy: { installationDate: "desc" },
        take: 6,
        include: {
          customer: { select: { name: true } },
          vehicle: { select: { registrationNo: true, make: true, model: true } },
        },
      }),

      // 10. Recent renewals received (for activity)
      prisma.renewal.findMany({
        where: { orgId, received: true },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          installation: {
            include: { customer: { select: { name: true } } },
          },
        },
      }),
    ]);

    /* ── Build chart data ── */
    const monthMap: Record<string, ChartPoint> = {};
    // Seed last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString("en", { month: "short" });
      monthMap[label] = { month: label, installs: 0, renewals: 0 };
    }
    for (const row of chartInstalls) {
      if (monthMap[row.month]) monthMap[row.month].installs = Number(row.revenue);
    }
    for (const row of chartRenewals) {
      if (monthMap[row.month]) monthMap[row.month].renewals = Number(row.revenue);
    }
    const chartData = Object.values(monthMap);

    /* ── Vehicle makes ── */
    const totalMakes = vehicleMakesRaw.reduce((s, r) => s + Number(r.cnt), 0) || 1;
    const vehicleMakes = vehicleMakesRaw.map(r => ({
      make: r.make,
      count: Number(r.cnt),
      pct: Math.round((Number(r.cnt) / totalMakes) * 100),
    }));

    /* ── Revenue for period ── */
    const installRev = Number(revenueAgg._sum.devicePayment ?? 0);
    const renewalRev =
      Number(renewalRevenueAgg._sum.amount ?? 0) +
      Number(renewalRevenueAgg._sum.simOsting ?? 0) +
      Number(renewalRevenueAgg._sum.net ?? 0) +
      Number(renewalRevenueAgg._sum.other ?? 0);

    /* ── Activity feed ── */
    const activity: DashboardData["activity"] = [];
    for (const inst of recentInstalls.slice(0, 3)) {
      activity.push({
        id: `inst-${inst.id}`,
        type: "installation",
        label: "New installation",
        sub: `${inst.customer.name} · ${inst.vehicle.registrationNo}`,
        amount: Number(inst.devicePayment),
        time: inst.createdAt.toISOString(),
      });
    }
    for (const ren of recentRenewals) {
      activity.push({
        id: `ren-${ren.id}`,
        type: "renewal",
        label: "Renewal received",
        sub: `${ren.installation.customer.name} · ${Number(ren.amount) + Number(ren.simOsting) + Number(ren.net) + Number(ren.other)}`,
        amount: Number(ren.amount) + Number(ren.simOsting) + Number(ren.net) + Number(ren.other),
        time: ren.createdAt.toISOString(),
      });
    }
    activity.sort((a, b) => b.time.localeCompare(a.time));

    return {
      period,
      kpi: {
        activeInstallations: activeInstallations,
        revenue: installRev + renewalRev,
        renewalsDue30d: Number(renewalsDueRaw[0]?.count ?? 0),
        stockCount: Number(stockAgg._sum.quantity ?? 0),
      },
      chartData,
      vehicleMakes,
      recentInstallations: recentInstalls.map(i => ({
        id: i.id,
        customer: i.customer.name,
        vehicle: [i.vehicle.make, i.vehicle.model].filter(Boolean).join(" ") || "—",
        regNo: i.vehicle.registrationNo,
        total: Number(i.devicePayment),
        date: i.installationDate.toISOString().slice(0, 10),
        status: i.status,
      })),
      activity: activity.slice(0, 6),
    };
  } catch (err) {
    console.error("[dashboard]", err);
    return null;
  }
}
