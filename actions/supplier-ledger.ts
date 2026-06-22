"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type LedgerEntry = {
  date: string;
  type: "opening" | "invoice" | "payment";
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

export type LedgerData = {
  supplierName: string;
  phone: string | null;
  address: string | null;
  entries: LedgerEntry[];
  totalDebit: number;
  totalCredit: number;
  finalBalance: number;
};

export async function fetchSupplierLedger(supplierId: string): Promise<LedgerData | null> {
  const session = await auth();
  if (!session) return null;
  const { orgId } = session.user;

  const [supplier, rawInvoices, rawPayments] = await Promise.all([
    prisma.supplier.findFirst({ where: { id: supplierId, orgId } }),
    prisma.purchaseInvoice.findMany({
      where: { supplierId, orgId },
      include: { device: { select: { fmModule: true } } },
      orderBy: { invoiceDate: "asc" },
    }),
    prisma.supplierPayment.findMany({
      where: { supplierId, orgId },
      include: { account: { select: { name: true } } },
      orderBy: { paidAt: "asc" },
    }),
  ]);

  if (!supplier) return null;

  type RawEntry = {
    date: Date;
    type: "opening" | "invoice" | "payment";
    description: string;
    debit: number;
    credit: number;
  };

  const rawEntries: RawEntry[] = [];

  if (Number(supplier.openingOwed) > 0) {
    rawEntries.push({
      date: supplier.createdAt,
      type: "opening",
      description: "Opening balance",
      debit: Number(supplier.openingOwed),
      credit: 0,
    });
  }

  for (const inv of rawInvoices) {
    rawEntries.push({
      date: inv.invoiceDate,
      type: "invoice",
      description: `Purchase — ${inv.device.fmModule ?? "Device"} × ${inv.quantity}`,
      debit: Number(inv.totalAmount),
      credit: 0,
    });
  }

  for (const pay of rawPayments) {
    rawEntries.push({
      date: pay.paidAt,
      type: "payment",
      description: `Payment${pay.account ? ` via ${pay.account.name}` : ""}${pay.note ? ` — ${pay.note}` : ""}`,
      debit: 0,
      credit: Number(pay.amount),
    });
  }

  rawEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

  let running = 0;
  const entries: LedgerEntry[] = rawEntries.map((e) => {
    running += e.debit - e.credit;
    return {
      date: e.date.toISOString().slice(0, 10),
      type: e.type,
      description: e.description,
      debit: e.debit,
      credit: e.credit,
      balance: running,
    };
  });

  const totalDebit = rawEntries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = rawEntries.reduce((s, e) => s + e.credit, 0);

  return {
    supplierName: supplier.name,
    phone: supplier.phone,
    address: supplier.address ?? null,
    entries,
    totalDebit,
    totalCredit,
    finalBalance: totalDebit - totalCredit,
  };
}
