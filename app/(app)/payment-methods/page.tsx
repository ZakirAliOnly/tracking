import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  AccountsView,
  type AccountRow,
  type TransferRow,
} from "@/components/accounts/AccountsView";

export default async function PaymentMethodsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const { orgId } = session.user;

  const todayStr = new Date().toISOString().slice(0, 10);

  const [rawAccounts, rawRenewals, rawInstallationPayments, rawExpenses, rawSupplierPayments, rawPurchaseInvoices, rawTransfers] =
    await Promise.all([
      prisma.account.findMany({ where: { orgId }, orderBy: { createdAt: "asc" } }),
      prisma.renewal.findMany({
        where: { orgId, received: true },
        select: { accountId: true, amount: true, simOsting: true, net: true, other: true },
      }),
      prisma.installationPayment.findMany({
        where: { orgId },
        select: { accountId: true, amount: true },
      }),
      prisma.expense.findMany({
        where: { orgId },
        select: { accountId: true, amount: true },
      }),
      prisma.supplierPayment.findMany({
        where: { orgId },
        select: { accountId: true, amount: true },
      }),
      prisma.purchaseInvoice.findMany({
        where: { orgId },
        select: { accountId: true, amountPaid: true },
      }),
      prisma.fundTransfer.findMany({
        where: { orgId },
        include: {
          from: { select: { name: true } },
          to: { select: { name: true } },
        },
        orderBy: { transferredAt: "desc" },
      }),
    ]);

  // Compute current balance per account
  const balances: Record<string, number> = {};
  for (const a of rawAccounts) {
    balances[a.id] = Number(a.openingBalance);
  }

  for (const r of rawRenewals) {
    if (r.accountId && r.accountId in balances) {
      balances[r.accountId] +=
        Number(r.amount) + Number(r.simOsting) + Number(r.net) + Number(r.other);
    }
  }

  for (const p of rawInstallationPayments) {
    if (p.accountId && p.accountId in balances) {
      balances[p.accountId] += Number(p.amount);
    }
  }

  for (const e of rawExpenses) {
    if (e.accountId && e.accountId in balances) {
      balances[e.accountId] -= Number(e.amount);
    }
  }

  for (const p of rawSupplierPayments) {
    if (p.accountId && p.accountId in balances) {
      balances[p.accountId] -= Number(p.amount);
    }
  }

  for (const inv of rawPurchaseInvoices) {
    if (inv.accountId && inv.accountId in balances) {
      balances[inv.accountId] -= Number(inv.amountPaid);
    }
  }

  for (const t of rawTransfers) {
    if (t.fromId in balances) balances[t.fromId] -= Number(t.amount);
    if (t.toId in balances) balances[t.toId] += Number(t.amount);
  }

  const accounts: AccountRow[] = rawAccounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    openingBalance: Number(a.openingBalance),
    currentBalance: balances[a.id] ?? Number(a.openingBalance),
    isActive: a.isActive,
  }));

  const toTransferRow = (t: (typeof rawTransfers)[0]): TransferRow => ({
    id: t.id,
    fromName: t.from.name,
    toName: t.to.name,
    amount: Number(t.amount),
    note: t.note,
    transferredAt: t.transferredAt.toISOString().slice(0, 10),
  });

  const transfers: TransferRow[] = rawTransfers.map(toTransferRow);
  const todayTransfers: TransferRow[] = rawTransfers
    .filter((t) => t.transferredAt.toISOString().slice(0, 10) === todayStr)
    .map(toTransferRow);

  return (
    <div className="p-6">
      <PageHeader
        title="Payment Methods"
        subtitle="Configure the cash, wallet and bank channels available across invoices and supplier payments. Each method tracks its own running balance."
      />
      <div className="mt-5">
        <AccountsView accounts={accounts} transfers={transfers} todayTransfers={todayTransfers} />
      </div>
    </div>
  );
}
