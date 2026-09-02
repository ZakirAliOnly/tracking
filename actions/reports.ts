"use server";

import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type ReportType = "overview" | "installations" | "renewals" | "suppliers" | "payment_method" | "stock" | "deleted";

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

export type DeletedStats = { count: number; totalAmount: number };
export type DeletedRow = {
  id: string; customer: string; vehicle: string; regNo: string;
  installDate: string; deletedAt: string; amount: number;
};

export type SupplierReportStats = { invoiceCount: number; totalValue: number; totalPaid: number; balanceDue: number };
export type SupplierReportRow = {
  id: string; supplier: string; device: string; qty: number;
  total: number; paid: number; remaining: number; date: string;
};

export type PaymentMethodStats = {
  accountName: string;
  openingBalance: number;
  moneyIn: number;
  moneyOut: number;
  closingBalance: number;
};
export type PaymentMethodRow = {
  id: string;
  date: string;
  type: "Installation" | "Renewal" | "Expense" | "Supplier Payment" | "Purchase Invoice" | "Transfer In" | "Transfer Out";
  description: string;
  amount: number; // signed — positive is money in, negative is money out
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
  | { type: "payment_method"; stats: PaymentMethodStats; rows: PaymentMethodRow[] }
  | { type: "stock"; stats: StockStats; rows: StockRow[] }
  | { type: "deleted"; stats: DeletedStats; rows: DeletedRow[] };

/* ─── Main action ─────────────────────────────────────────────── */

/**
 * What the customer actually owes: the generated total less any discount.
 * `device_payment` is not collected on entry any more, so reading it alone
 * reported every installation as worth nothing.
 */
function payableOf(installation: { totalAmount: Prisma.Decimal | null; discount: Prisma.Decimal }): number {
  return Math.max(Number(installation.totalAmount ?? 0) - Number(installation.discount), 0);
}

export async function generateReport(
  type: ReportType,
  dateFrom: string,
  dateTo: string,
  accountId?: string
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
          where: { orgId, deletedAt: null, installationDate: { gte: from, lte: to } },
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

      const installRevenue = installs.reduce((s, i) => s + payableOf(i), 0);
      const installCollected = installs.reduce((s, i) => s + Number(i.amountPaid), 0);
      const renewalRevenue = renewals.filter(r => r.received).reduce((s, r) =>
        s + Number(r.amount) + Number(r.simOsting) + Number(r.net) + Number(r.other), 0);

      const rows: OverviewRow[] = [
        ...installs.map(i => ({
          id: i.id, type: "Installation" as const,
          customer: i.customer.name,
          vehicle: [i.vehicle.make, i.vehicle.model].filter(Boolean).join(" ") || i.vehicle.registrationNo,
          device: i.device?.fmModule ?? "—",
          date: i.installationDate.toISOString().slice(0, 10),
          revenue: payableOf(i),
          collected: Number(i.amountPaid),
          remaining: Math.max(0, payableOf(i) - Number(i.amountPaid)),
        })),
        ...renewals.map(r => {
          const amt = Number(r.amount) + Number(r.simOsting) + Number(r.net) + Number(r.other);
          return {
            id: r.id, type: "Renewal" as const,
            customer: r.installation.customer.name,
            vehicle: r.installation.vehicle.registrationNo,
            device: r.installation.device?.fmModule ?? "—",
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
        where: { orgId, deletedAt: null, installationDate: { gte: from, lte: to } },
        include: {
          customer: { select: { name: true } },
          vehicle: { select: { registrationNo: true, make: true, model: true } },
          device: { select: { fmModule: true, imeiNo: true } },
        },
        orderBy: { installationDate: "desc" },
      });

      const totalRevenue = rows.reduce((s, r) => s + payableOf(r), 0);
      const totalCollected = rows.reduce((s, r) => s + Number(r.amountPaid), 0);

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
            device: r.device?.fmModule ?? "—",
            imeiNo: r.device?.imeiNo ?? null,
            date: r.installationDate.toISOString().slice(0, 10),
            total: payableOf(r),
            paid: Number(r.amountPaid),
            remaining: Math.max(0, payableOf(r) - Number(r.amountPaid)),
          })),
        },
      };
    }

    if (type === "deleted") {
      // Dated by when it was trashed, not when the job was originally done —
      // this report is about deletions in the window, not installations
      const rows = await prisma.installation.findMany({
        where: { orgId, deletedAt: { not: null, gte: from, lte: to } },
        include: {
          customer: { select: { name: true } },
          vehicle: { select: { registrationNo: true, make: true, model: true } },
        },
        orderBy: { deletedAt: "desc" },
      });

      const totalAmount = rows.reduce((s, r) => s + payableOf(r), 0);

      return {
        success: true,
        result: {
          type: "deleted",
          stats: { count: rows.length, totalAmount },
          rows: rows.map(r => ({
            id: r.id,
            customer: r.customer.name,
            vehicle: [r.vehicle.make, r.vehicle.model].filter(Boolean).join(" ") || "—",
            regNo: r.vehicle.registrationNo,
            installDate: r.installationDate.toISOString().slice(0, 10),
            // Non-null guaranteed by the where clause above
            deletedAt: r.deletedAt!.toISOString().slice(0, 10),
            amount: payableOf(r),
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

    if (type === "payment_method") {
      if (!accountId) return { success: false, error: "Select a payment method first." };

      const account = await prisma.account.findFirst({ where: { id: accountId, orgId } });
      if (!account) return { success: false, error: "That payment method is not available." };

      const [installations, renewals, expenses, supplierPayments, purchaseInvoices, transfersOut, transfersIn] =
        await Promise.all([
          prisma.installation.findMany({
            where: { orgId, accountId, deletedAt: null },
            include: { customer: { select: { name: true } }, vehicle: { select: { registrationNo: true } } },
          }),
          prisma.renewal.findMany({
            where: { orgId, accountId, received: true },
            include: {
              installation: {
                include: { customer: { select: { name: true } }, vehicle: { select: { registrationNo: true } } },
              },
            },
          }),
          prisma.expense.findMany({ where: { orgId, accountId } }),
          prisma.supplierPayment.findMany({
            where: { orgId, accountId },
            include: { supplier: { select: { name: true } } },
          }),
          prisma.purchaseInvoice.findMany({
            where: { orgId, accountId },
            include: { supplier: { select: { name: true } }, device: { select: { fmModule: true } } },
          }),
          prisma.fundTransfer.findMany({
            where: { orgId, fromId: accountId },
            include: { to: { select: { name: true } } },
          }),
          prisma.fundTransfer.findMany({
            where: { orgId, toId: accountId },
            include: { from: { select: { name: true } } },
          }),
        ]);

      type Movement = { date: Date; type: PaymentMethodRow["type"]; description: string; amount: number };
      const movements: Movement[] = [];

      for (const i of installations) {
        if (!i.totalAmount) continue;
        movements.push({
          date: i.installationDate,
          type: "Installation",
          description: `${i.customer.name} — ${i.vehicle.registrationNo}`,
          amount: Number(i.totalAmount),
        });
      }
      for (const r of renewals) {
        movements.push({
          date: r.renewedAt,
          type: "Renewal",
          description: `${r.installation.customer.name} — ${r.installation.vehicle.registrationNo}`,
          amount: Number(r.amount) + Number(r.simOsting) + Number(r.net) + Number(r.other),
        });
      }
      for (const e of expenses) {
        movements.push({
          date: e.spentAt,
          type: "Expense",
          description: e.description ?? "Expense",
          amount: -Number(e.amount),
        });
      }
      for (const p of supplierPayments) {
        movements.push({
          date: p.paidAt,
          type: "Supplier Payment",
          description: `Paid to ${p.supplier.name}`,
          amount: -Number(p.amount),
        });
      }
      for (const inv of purchaseInvoices) {
        const paid = Number(inv.amountPaid);
        if (paid === 0) continue;
        movements.push({
          date: inv.invoiceDate,
          type: "Purchase Invoice",
          description: `${inv.supplier.name} — ${inv.device.fmModule ?? "device"}`,
          amount: -paid,
        });
      }
      for (const t of transfersOut) {
        movements.push({
          date: t.transferredAt,
          type: "Transfer Out",
          description: `Transfer to ${t.to.name}`,
          amount: -Number(t.amount),
        });
      }
      for (const t of transfersIn) {
        movements.push({
          date: t.transferredAt,
          type: "Transfer In",
          description: `Transfer from ${t.from.name}`,
          amount: Number(t.amount),
        });
      }

      const openingBalance =
        Number(account.openingBalance) +
        movements.filter(m => m.date < from).reduce((s, m) => s + m.amount, 0);

      const inRange = movements
        .filter(m => m.date >= from && m.date <= to)
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      const moneyIn = inRange.filter(m => m.amount > 0).reduce((s, m) => s + m.amount, 0);
      const moneyOut = inRange.filter(m => m.amount < 0).reduce((s, m) => s + Math.abs(m.amount), 0);

      return {
        success: true,
        result: {
          type: "payment_method",
          stats: {
            accountName: account.name,
            openingBalance,
            moneyIn,
            moneyOut,
            closingBalance: openingBalance + moneyIn - moneyOut,
          },
          rows: inRange.map((m, idx) => ({
            id: `${m.type}-${idx}-${m.date.getTime()}`,
            date: m.date.toISOString().slice(0, 10),
            type: m.type,
            description: m.description,
            amount: m.amount,
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
