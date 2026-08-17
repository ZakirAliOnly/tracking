import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExpensesView, type ExpenseRow } from "@/components/expenses/ExpensesView";

export default async function ExpensesPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const { orgId } = session.user;

  const [expenses, accounts] = await Promise.all([
    prisma.expense.findMany({
      where: { orgId },
      include: {
        account: { select: { name: true } },
      },
      orderBy: { spentAt: "desc" },
    }),
    prisma.account.findMany({
      where: { orgId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows: ExpenseRow[] = expenses.map((e) => ({
    id: e.id,
    description: e.description,
    amount: Number(e.amount),
    accountName: e.account?.name ?? null,
    spentAt: e.spentAt.toISOString().slice(0, 10),
  }));

  return (
    <div className="p-6">
      <PageHeader
        title="Expenses"
        subtitle="Record spending against a payment method — the amount is deducted from that account's balance."
      />
      <div className="mt-5">
        <ExpensesView expenses={rows} accounts={accounts} />
      </div>
    </div>
  );
}
