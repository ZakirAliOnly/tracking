import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  SuppliersView,
  type SupplierRow,
  type InvoiceRow,
  type SupplierStats,
} from "@/components/suppliers/SuppliersView";
import type { AccountOption } from "@/components/suppliers/PaySupplierModal";
import type { SupplierOption, DeviceOption } from "@/components/suppliers/NewInvoiceModal";
import { pageWindow, parsePage } from "@/lib/pagination";

type Tab = "suppliers" | "invoices";

type Props = {
  searchParams: Promise<{ tab?: string; spage?: string; ipage?: string }>;
};

export default async function SuppliersPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  const { orgId } = session.user;
  const sp = await searchParams;

  const tab: Tab = sp.tab === "invoices" ? "invoices" : "suppliers";
  const supplierPage = parsePage(sp.spage);
  const invoicePage = parsePage(sp.ipage);

  const [
    rawSuppliers,
    supplierTotal,
    rawInvoices,
    invoiceTotal,
    // Every supplier's own openingOwed, plus org-wide invoice/payment totals
    // grouped by supplier — a supplier's payable depends on its whole history,
    // not just what's on the current page, so these stay full aggregates
    allOpeningOwed,
    invoiceTotalsBySupplier,
    paymentTotalsBySupplier,
    itemsSuppliedAgg,
    rawAccounts,
    rawDevices,
    supplierOptionsRaw,
  ] = await Promise.all([
    prisma.supplier.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
      ...pageWindow(supplierPage),
    }),
    prisma.supplier.count({ where: { orgId } }),
    prisma.purchaseInvoice.findMany({
      where: { orgId },
      include: {
        supplier: { select: { name: true } },
        device: { select: { fmModule: true } },
      },
      orderBy: { invoiceDate: "desc" },
      ...pageWindow(invoicePage),
    }),
    prisma.purchaseInvoice.count({ where: { orgId } }),
    prisma.supplier.findMany({ where: { orgId }, select: { id: true, openingOwed: true } }),
    prisma.purchaseInvoice.groupBy({
      by: ["supplierId"],
      where: { orgId },
      _sum: { totalAmount: true, amountPaid: true },
    }),
    prisma.supplierPayment.groupBy({
      by: ["supplierId"],
      where: { orgId },
      _sum: { amount: true },
    }),
    prisma.purchaseInvoice.aggregate({ where: { orgId }, _sum: { quantity: true } }),
    prisma.account.findMany({
      where: { orgId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.device.findMany({
      where: { orgId, status: { in: ["in_stock", "faulty", "returned"] } },
      select: { id: true, fmModule: true, costPrice: true, salePrice: true },
      orderBy: { fmModule: "asc" },
    }),
    // Full, unpaginated — the New Invoice modal's supplier picker needs every
    // supplier, not just the current page's 25
    prisma.supplier.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const openingOwedById = new Map(allOpeningOwed.map((s) => [s.id, Number(s.openingOwed)]));
  const invoiceTotals = new Map(invoiceTotalsBySupplier.map((g) => [g.supplierId, Number(g._sum.totalAmount ?? 0)]));
  const invoicePaidTotals = new Map(invoiceTotalsBySupplier.map((g) => [g.supplierId, Number(g._sum.amountPaid ?? 0)]));
  const paymentTotals = new Map(paymentTotalsBySupplier.map((g) => [g.supplierId, Number(g._sum.amount ?? 0)]));

  function payableOf(supplierId: string): number {
    return (
      (openingOwedById.get(supplierId) ?? 0) +
      (invoiceTotals.get(supplierId) ?? 0) -
      (invoicePaidTotals.get(supplierId) ?? 0) -
      (paymentTotals.get(supplierId) ?? 0)
    );
  }

  const suppliers: SupplierRow[] = rawSuppliers.map((s) => ({
    id: s.id,
    name: s.name,
    phone: s.phone,
    contactName: s.contactName,
    address: s.address ?? null,
    openingOwed: s.openingOwed.toString(),
    estPayable: payableOf(s.id).toString(),
    supplies: s.supplies,
  }));

  const invoices: InvoiceRow[] = rawInvoices.map((inv) => ({
    id: inv.id,
    supplierName: inv.supplier.name,
    deviceName: inv.device.fmModule,
    quantity: inv.quantity,
    costPrice: inv.costPrice.toString(),
    salePrice: inv.salePrice?.toString() ?? null,
    totalAmount: inv.totalAmount.toString(),
    amountPaid: inv.amountPaid?.toString() ?? "0",
    invoiceDate: inv.invoiceDate.toISOString().slice(0, 10),
    notes: inv.notes,
  }));

  // Global stat across every supplier, not just the current page
  const totalPayable = allOpeningOwed.reduce((sum, s) => {
    const payable = payableOf(s.id);
    return sum + (payable > 0 ? payable : 0);
  }, 0);

  const stats: SupplierStats = {
    totalSuppliers: supplierTotal,
    itemsSupplied: itemsSuppliedAgg._sum.quantity ?? 0,
    totalPayable,
  };

  const accounts: AccountOption[] = rawAccounts.map((a) => ({
    id: a.id,
    name: a.name,
  }));

  const supplierOptions: SupplierOption[] = supplierOptionsRaw.map((s) => ({
    id: s.id,
    name: s.name,
  }));

  const deviceOptions: DeviceOption[] = rawDevices.map((d) => ({
    id: d.id,
    name: d.fmModule ?? "Unknown device",
    costPrice: d.costPrice?.toString() ?? null,
    salePrice: d.salePrice?.toString() ?? null,
  }));

  return (
    <div className="p-6">
      <PageHeader title="Suppliers" subtitle="Manage suppliers and purchase invoices" />
      <div className="mt-5">
        <SuppliersView
          suppliers={suppliers}
          invoices={invoices}
          stats={stats}
          accounts={accounts}
          supplierOptions={supplierOptions}
          deviceOptions={deviceOptions}
          tab={tab}
          supplierPage={supplierPage}
          supplierTotal={supplierTotal}
          invoicePage={invoicePage}
          invoiceTotal={invoiceTotal}
          searchParams={sp}
        />
      </div>
    </div>
  );
}
