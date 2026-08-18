import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { ExpensesView, type ExpenseRow, type Filter } from "@/components/expenses/ExpensesView";
import { pageWindow, parsePage } from "@/lib/pagination";
import type { Prisma } from "@prisma/client";

/**
 * Boundaries built in UTC to match how `spentAt` is stored — `new Date("YYYY-MM-DD")`
 * (the write path in actions/expenses.ts) parses as UTC midnight, so the range
 * has to be anchored the same way rather than the local-timezone constructor.
 */
function dateRangeForFilter(filter: Filter): { gte: Date; lt: Date } | null {
  if (filter === "all") return null;
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();

  if (filter === "month") {
    return { gte: new Date(Date.UTC(y, m, 1)), lt: new Date(Date.UTC(y, m + 1, 1)) };
  }
  if (filter === "quarter") {
    const q = Math.floor(m / 3);
    return { gte: new Date(Date.UTC(y, q * 3, 1)), lt: new Date(Date.UTC(y, q * 3 + 3, 1)) };
  }
  return { gte: new Date(Date.UTC(y, 0, 1)), lt: new Date(Date.UTC(y + 1, 0, 1)) };
}

type Props = {
  searchParams: Promise<{ range?: string; page?: string }>;
};

export default async function ExpensesPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  const { orgId } = session.user;
  const sp = await searchParams;

  const filter: Filter =
    sp.range === "quarter" || sp.range === "year" || sp.range === "all" ? sp.range : "month";
  const page = parsePage(sp.page);

  const range = dateRangeForFilter(filter);
  const where: Prisma.ExpenseWhereInput = {
    orgId,
    ...(range ? { spentAt: { gte: range.gte, lt: range.lt } } : {}),
  };

  const [expensesRaw, total, sum, accounts] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { account: { select: { name: true } } },
      orderBy: { spentAt: "desc" },
      ...pageWindow(page),
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
    prisma.account.findMany({
      where: { orgId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows: ExpenseRow[] = expensesRaw.map((e) => ({
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
        <ExpensesView
          expenses={rows}
          accounts={accounts}
          filter={filter}
          page={page}
          total={total}
          totalAmount={Number(sum._sum.amount ?? 0)}
          searchParams={sp}
        />
      </div>
    </div>
  );
}
