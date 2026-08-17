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

export default async function SuppliersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const { orgId } = session.user;

  const [rawSuppliers, rawInvoices, rawPayments, rawAccounts, rawDevices] = await Promise.all([
    prisma.supplier.findMany({
      where: { orgId },
      orderBy: { name: "asc" },
    }),
    prisma.purchaseInvoice.findMany({
      where: { orgId },
      include: {
        supplier: { select: { name: true } },
        device: { select: { fmModule: true } },
      },
      orderBy: { invoiceDate: "desc" },
    }),
    prisma.supplierPayment.findMany({
      where: { orgId },
      select: { supplierId: true, amount: true },
    }),
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
  ]);

  // Compute estPayable per supplier
  const invoiceTotals: Record<string, number> = {};
  const invoicePaidTotals: Record<string, number> = {};
  for (const inv of rawInvoices) {
    invoiceTotals[inv.supplierId] =
      (invoiceTotals[inv.supplierId] ?? 0) + Number(inv.totalAmount);
    invoicePaidTotals[inv.supplierId] =
      (invoicePaidTotals[inv.supplierId] ?? 0) + Number(inv.amountPaid ?? 0);
  }

  const paymentTotals: Record<string, number> = {};
  for (const pay of rawPayments) {
    paymentTotals[pay.supplierId] =
      (paymentTotals[pay.supplierId] ?? 0) + Number(pay.amount);
  }

  const suppliers: SupplierRow[] = rawSuppliers.map((s) => {
    const estPayable =
      Number(s.openingOwed) +
      (invoiceTotals[s.id] ?? 0) -
      (invoicePaidTotals[s.id] ?? 0) -
      (paymentTotals[s.id] ?? 0);
    return {
      id: s.id,
      name: s.name,
      phone: s.phone,
      contactName: s.contactName,
      address: s.address ?? null,
      openingOwed: s.openingOwed.toString(),
      estPayable: estPayable.toString(),
      supplies: s.supplies,
    };
  });

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

  const totalItemsSupplied = rawInvoices.reduce((sum, inv) => sum + inv.quantity, 0);
  const totalPayable = suppliers.reduce((sum, s) => {
    const v = parseFloat(s.estPayable);
    return sum + (v > 0 ? v : 0);
  }, 0);

  const stats: SupplierStats = {
    totalSuppliers: suppliers.length,
    itemsSupplied: totalItemsSupplied,
    totalPayable,
  };

  const accounts: AccountOption[] = rawAccounts.map((a) => ({
    id: a.id,
    name: a.name,
  }));

  const supplierOptions: SupplierOption[] = rawSuppliers.map((s) => ({
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
        />
      </div>
    </div>
  );
}
