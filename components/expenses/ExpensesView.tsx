"use client";

import { useMemo, useState } from "react";
import { Plus, Receipt, Trash2 } from "lucide-react";
import { deleteExpense } from "@/actions/expenses";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { AddExpenseModal, type AccountOption } from "@/components/expenses/AddExpenseModal";

export type ExpenseRow = {
  id: string;
  description: string | null;
  amount: number;
  accountName: string | null;
  spentAt: string; // YYYY-MM-DD
};

type Props = {
  expenses: ExpenseRow[];
  accounts: AccountOption[];
};

type Filter = "month" | "quarter" | "year" | "all";
const FILTER_LABELS: Record<Filter, string> = {
  month: "This month",
  quarter: "Quarter",
  year: "Year",
  all: "All",
};

function fmtRs(v: number) {
  return `Rs ${Math.round(v).toLocaleString("en-PK")}`;
}

function inRange(spentAt: string, filter: Filter): boolean {
  if (filter === "all") return true;
  const now = new Date();
  const d = new Date(spentAt);
  if (filter === "month") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (filter === "quarter") {
    const q = (m: number) => Math.floor(m / 3);
    return d.getFullYear() === now.getFullYear() && q(d.getMonth()) === q(now.getMonth());
  }
  return d.getFullYear() === now.getFullYear();
}

export function ExpensesView({ expenses, accounts }: Props) {
  const [filter, setFilter] = useState<Filter>("month");
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo(
    () => expenses.filter((e) => inRange(e.spentAt, filter)),
    [expenses, filter]
  );

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  return (
    <>
      <AddExpenseModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        accounts={accounts}
      />

      {/* Toolbar */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center rounded-[9px] border border-border bg-surface p-1">
          {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-[7px] px-3.5 py-1.5 text-[13px] transition-colors ${
                filter === f
                  ? "bg-text-primary font-semibold text-white"
                  : "font-medium text-text-secondary hover:text-text-primary"
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>

        <button
          onClick={() => setAddOpen(true)}
          className="flex h-9 items-center gap-2 rounded-[9px] bg-accent px-4 text-[13px] font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          style={{ boxShadow: "0 1px 2px rgba(225,29,72,0.20), 0 4px 12px -4px rgba(225,29,72,0.40)" }}
        >
          <Plus className="h-4 w-4" />
          Add expense
        </button>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-2 gap-4">
        <div
          className="flex flex-col gap-1 rounded-[16px] border border-border bg-surface px-6 py-5"
          style={{ boxShadow: "0 1px 2px rgba(26,20,20,0.05), 0 4px 16px -8px rgba(26,20,20,0.10)" }}
        >
          <p className="text-[13px] font-medium text-text-secondary">
            Total — {FILTER_LABELS[filter].toLowerCase()}
          </p>
          <p className="font-display text-[32px] font-bold leading-9 text-text-primary">
            {fmtRs(total)}
          </p>
        </div>
        <div
          className="flex flex-col gap-1 rounded-[16px] border border-border bg-surface px-6 py-5"
          style={{ boxShadow: "0 1px 2px rgba(26,20,20,0.05), 0 4px 16px -8px rgba(26,20,20,0.10)" }}
        >
          <p className="text-[13px] font-medium text-text-secondary">Expenses recorded</p>
          <p className="font-display text-[32px] font-bold leading-9 text-text-primary">
            {filtered.length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-[20px] border border-border bg-surface"
        style={{ boxShadow: "0 1px 2px rgba(26,20,20,0.05), 0 6px 22px -8px rgba(26,20,20,0.14)" }}
      >
        {filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                {["Description", "Account", "Date", "Amount", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted first:pl-5"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((expense, i) => (
                <tr
                  key={expense.id}
                  className={`transition-colors hover:bg-surface-muted ${
                    i < filtered.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <td className="pl-5 pr-4 py-4">
                    <span className="text-[13px] text-text-primary">
                      {expense.description ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-[13px] text-text-secondary">
                      {expense.accountName ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-mono text-[13px] text-text-secondary">
                      {expense.spentAt}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-mono text-[13px] font-semibold text-text-primary">
                      {fmtRs(expense.amount)}
                    </span>
                  </td>
                  <td className="pl-2 pr-5 py-4">
                    <form
                      action={async (fd: FormData) => {
                        await deleteExpense(null, fd);
                      }}
                      onSubmit={(e) => {
                        if (!window.confirm("Delete this expense? This cannot be undone."))
                          e.preventDefault();
                      }}
                    >
                      <input type="hidden" name="id" value={expense.id} />
                      <SubmitButton
                        pendingLabel=""
                        spinnerClassName="h-3.5 w-3.5"
                        className="flex h-8 w-8 items-center justify-center rounded-[8px] text-text-muted transition-colors hover:bg-error-light hover:text-error disabled:opacity-60"
                        aria-label="Delete expense"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function EmptyState({ filter }: { filter: Filter }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="flex h-14 w-14 items-center justify-center rounded-[14px] bg-accent-light">
        <Receipt className="h-7 w-7 text-accent" />
      </div>
      <div className="text-center">
        <p className="text-[15px] font-semibold text-text-primary">No expenses yet</p>
        <p className="mt-1 text-[13px] text-text-secondary">
          {filter === "all"
            ? "Add your first expense to get started."
            : `No expenses recorded for ${FILTER_LABELS[filter].toLowerCase()}.`}
        </p>
      </div>
    </div>
  );
}
