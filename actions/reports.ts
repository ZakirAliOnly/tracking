"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ReportType = "overview" | "installations" | "renewals" | "suppliers" | "payments" | "stock";

/* ─── Per-report row/stats types ─────────────────────────────── */

export type OverviewStats = {
  totalInstallations: number;
  totalRenewals: number;
  totalRevenue: number;
  totalCollected: number;
  balanceDue: number;
};
export type OverviewRow = {
  id: string; type: "Installation" | "Renewal"; customer: string;
  vehicle: string; device: string; date: string;
  revenue: number; collected: number; remaining: number;
};

export type InstallStats = { count: number; totalRevenue: number; totalCollected: number; balanceDue: number };
export type InstallRow = {
  id: string; customer: string; vehicle: string; regNo: string;
  device: string; imeiNo: string | null; date: string;
  total: number; paid: number; remaining: number;
};

export type RenewalStats = { count: number; received: number; pending: number; totalReceived: number; totalPending: number };
export type RenewalRow = {
  id: string; customer: string; regNo: string; date: string;
  amount: number; received: boolean;
};

export type SupplierReportStats = { invoiceCount: number; totalValue: number; totalPaid: number; balanceDue: number };
export type SupplierReportRow = {
  id: string; supplier: string; device: string; qty: number;
  total: number; paid: number; remaining: number; date: string;
};

export type PaymentStats = { transferCount: number; totalMoved: number };
export type PaymentRow = {
  id: string; from: string; to: string; amount: number; note: string | null; date: string;
};

export type StockStats = { total: number; inStock: number; installed: number; totalCostValue: number };
export type StockRow = {
  id: string; name: string; imeiNo: string | null; status: string;
  costPrice: number | null; salePrice: number | null; quantity: number;
};

export type ReportResult =
  | { type: "overview"; stats: OverviewStats; rows: OverviewRow[] }
  | { type: "installations"; stats: InstallStats; rows: InstallRow[] }
  | { type: "renewals"; stats: RenewalStats; rows: RenewalRow[] }
  | { type: "suppliers"; stats: SupplierReportStats; rows: SupplierReportRow[] }
  | { type: "payments"; stats: PaymentStats; rows: PaymentRow[] }
  | { type: "stock"; stats: StockStats; rows: StockRow[] };

/* ─── Main action ─────────────────────────────────────────────── */

export async function generateReport(
  type: ReportType,
  dateFrom: string,
  dateTo: string
): Promise<{ success: boolean; error?: string; result?: ReportResult }> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };
    const { orgId } = session.user;

    const from = new Date(dateFrom);
    const to = new Date(dateTo + "T23:59:59");

    if (type === "overview") {
      const [installs, renewals] = await Promise.all([
        prisma.installation.findMany({
          where: { orgId, installationDate: { gte: from, lte: to } },
          include: {
            customer: { select: { name: true } },
            vehicle: { select: { registrationNo: true, make: true, model: true } },
            device: { select: { fmModule: true } },
          },
          orderBy: { installationDate: "desc" },
        }),
        prisma.renewal.findMany({
          where: { orgId, renewedAt: { gte: from, lte: to } },
          include: {
            installation: {
              include: {
                customer: { select: { name: true } },
                vehicle: { select: { registrationNo: true } },
                device: { select: { fmModule: true } },
              },
            },
          },
          orderBy: { renewedAt: "desc" },
        }),
      ]);

      const installRevenue = installs.reduce((s, i) => s + Number(i.devicePayment), 0);
      const installCollected = installs.reduce((s, i) => s + Number((i as any).amountPaid ?? 0), 0);
      const renewalRevenue = renewals.filter(r => r.received).reduce((s, r) =>
        s + Number(r.amount) + Number(r.simOsting) + Number(r.net) + Number(r.other), 0);

      const rows: OverviewRow[] = [
        ...installs.map(i => ({
          id: i.id, type: "Installation" as const,
          customer: i.customer.name,
          vehicle: [i.vehicle.make, i.vehicle.model].filter(Boolean).join(" ") || i.vehicle.registrationNo,
          device: i.device.fmModule ?? "—",
          date: i.installationDate.toISOString().slice(0, 10),
          revenue: Number(i.devicePayment),
          collected: Number((i as any).amountPaid ?? 0),
          remaining: Math.max(0, Number(i.devicePayment) - Number((i as any).amountPaid ?? 0)),
        })),
        ...renewals.map(r => {
          const amt = Number(r.amount) + Number(r.simOsting) + Number(r.net) + Number(r.other);
          return {
            id: r.id, type: "Renewal" as const,
            customer: r.installation.customer.name,
            vehicle: r.installation.vehicle.registrationNo,
            device: r.installation.device.fmModule ?? "—",
            date: r.renewedAt.toISOString().slice(0, 10),
            revenue: r.received ? amt : 0,
            collected: r.received ? amt : 0,
            remaining: r.received ? 0 : amt,
          };
        }),
      ].sort((a, b) => b.date.localeCompare(a.date));

      return {
        success: true,
        result: {
          type: "overview",
          stats: {
            totalInstallations: installs.length,
            totalRenewals: renewals.length,
            totalRevenue: installRevenue + renewalRevenue,
            totalCollected: installCollected + renewalRevenue,
            balanceDue: (installRevenue + renewalRevenue) - (installCollected + renewalRevenue),
          },
          rows,
        },
      };
    }

    if (type === "installations") {
      const rows = await prisma.installation.findMany({
        where: { orgId, installationDate: { gte: from, lte: to } },
        include: {
          customer: { select: { name: true } },
          vehicle: { select: { registrationNo: true, make: true, model: true } },
          device: { select: { fmModule: true, imeiNo: true } },
        },
        orderBy: { installationDate: "desc" },
      });

      const totalRevenue = rows.reduce((s, r) => s + Number(r.devicePayment), 0);
      const totalCollected = rows.reduce((s, r) => s + Number((r as any).amountPaid ?? 0), 0);

      return {
        success: true,
        result: {
          type: "installations",
          stats: { count: rows.length, totalRevenue, totalCollected, balanceDue: totalRevenue - totalCollected },
          rows: rows.map(r => ({
            id: r.id,
            customer: r.customer.name,
            vehicle: [r.vehicle.make, r.vehicle.model].filter(Boolean).join(" ") || "—",
            regNo: r.vehicle.registrationNo,
            device: r.device.fmModule ?? "—",
            imeiNo: r.device.imeiNo,
            date: r.installationDate.toISOString().slice(0, 10),
            total: Number(r.devicePayment),
            paid: Number((r as any).amountPaid ?? 0),
            remaining: Math.max(0, Number(r.devicePayment) - Number((r as any).amountPaid ?? 0)),
          })),
        },
      };
    }

    if (type === "renewals") {
      const rows = await prisma.renewal.findMany({
        where: { orgId, renewedAt: { gte: from, lte: to } },
        include: {
          installation: {
            include: {
              customer: { select: { name: true } },
              vehicle: { select: { registrationNo: true } },
            },
          },
        },
        orderBy: { renewedAt: "desc" },
      });

      const received = rows.filter(r => r.received);
      const pending = rows.filter(r => !r.received);
      const getAmt = (r: typeof rows[0]) =>
        Number(r.amount) + Number(r.simOsting) + Number(r.net) + Number(r.other);

      return {
        success: true,
        result: {
          type: "renewals",
          stats: {
            count: rows.length,
            received: received.length,
            pending: pending.length,
            totalReceived: received.reduce((s, r) => s + getAmt(r), 0),
            totalPending: pending.reduce((s, r) => s + getAmt(r), 0),
          },
          rows: rows.map(r => ({
            id: r.id,
            customer: r.installation.customer.name,
            regNo: r.installation.vehicle.registrationNo,
            date: r.renewedAt.toISOString().slice(0, 10),
            amount: getAmt(r),
            received: r.received,
          })),
        },
      };
    }

    if (type === "suppliers") {
      const [invoices, payments] = await Promise.all([
        prisma.purchaseInvoice.findMany({
          where: { orgId, invoiceDate: { gte: from, lte: to } },
          include: {
            supplier: { select: { name: true } },
            device: { select: { fmModule: true } },
          },
          orderBy: { invoiceDate: "desc" },
        }),
        prisma.supplierPayment.findMany({ where: { orgId }, select: { supplierId: true, amount: true } }),
      ]);

      const paymentsBySup: Record<string, number> = {};
      for (const p of payments) {
        paymentsBySup[p.supplierId] = (paymentsBySup[p.supplierId] ?? 0) + Number(p.amount);
      }

      const totalValue = invoices.reduce((s, i) => s + Number(i.totalAmount), 0);
      const totalPaid = invoices.reduce((s, i) => s + Number((i as any).amountPaid ?? 0), 0);

      return {
        success: true,
        result: {
          type: "suppliers",
          stats: {
            invoiceCount: invoices.length,
            totalValue,
            totalPaid,
            balanceDue: totalValue - totalPaid,
          },
          rows: invoices.map(inv => {
            const paid = Number((inv as any).amountPaid ?? 0);
            return {
              id: inv.id,
              supplier: inv.supplier.name,
              device: inv.device.fmModule ?? "—",
              qty: inv.quantity,
              total: Number(inv.totalAmount),
              paid,
              remaining: Math.max(0, Number(inv.totalAmount) - paid),
              date: inv.invoiceDate.toISOString().slice(0, 10),
            };
          }),
        },
      };
    }

    if (type === "payments") {
      const transfers = await prisma.fundTransfer.findMany({
        where: { orgId, transferredAt: { gte: from, lte: to } },
        include: {
          from: { select: { name: true } },
          to: { select: { name: true } },
        },
        orderBy: { transferredAt: "desc" },
      });

      return {
        success: true,
        result: {
          type: "payments",
          stats: {
            transferCount: transfers.length,
            totalMoved: transfers.reduce((s, t) => s + Number(t.amount), 0),
          },
          rows: transfers.map(t => ({
            id: t.id,
            from: t.from.name,
            to: t.to.name,
            amount: Number(t.amount),
            note: t.note,
            date: t.transferredAt.toISOString().slice(0, 10),
          })),
        },
      };
    }

    if (type === "stock") {
      const devices = await prisma.device.findMany({
        where: { orgId },
        orderBy: { createdAt: "desc" },
      });

      const inStock = devices.filter(d => d.status === "in_stock");
      const installed = devices.filter(d => d.status === "installed");
      const totalCostValue = inStock.reduce((s, d) => s + Number(d.costPrice ?? 0) * d.quantity, 0);

      return {
        success: true,
        result: {
          type: "stock",
          stats: {
            total: devices.length,
            inStock: inStock.reduce((s, d) => s + d.quantity, 0),
            installed: installed.length,
            totalCostValue,
          },
          rows: devices.map(d => ({
            id: d.id,
            name: d.fmModule ?? "Unknown",
            imeiNo: d.imeiNo,
            status: d.status,
            costPrice: d.costPrice ? Number(d.costPrice) : null,
            salePrice: d.salePrice ? Number(d.salePrice) : null,
            quantity: d.quantity,
          })),
        },
      };
    }

    return { success: false, error: "Unknown report type" };
  } catch (error) {
    console.error("[reports/generate]", error);
    return { success: false, error: "Failed to generate report." };
  }
}
