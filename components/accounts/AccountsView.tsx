"use client";

import { useState } from "react";
import { CreditCard, ArrowLeftRight, Plus, Pencil, Trash2, DollarSign, Clock } from "lucide-react";
import { AddAccountModal, type AccountEditTarget } from "./AddAccountModal";
import { TransferFundsModal, type AccountOption } from "./TransferFundsModal";
import { deleteAccount } from "@/actions/accounts";
import { SubmitButton } from "@/components/ui/SubmitButton";

export type AccountRow = {
  id: string;
  name: string;
  type: string;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
};

export type TransferRow = {
  id: string;
  fromName: string;
  toName: string;
  amount: number;
  note: string | null;
  transferredAt: string;
};

type Props = {
  accounts: AccountRow[];
  transfers: TransferRow[];
  todayTransfers: TransferRow[];
};

function fmtRs(v: number) {
  return `Rs ${Math.round(v).toLocaleString("en-PK")}`;
}

function SectionHeader({ icon: Icon, label, count }: { icon: React.ElementType; label: string; count: number }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-text-muted" />
        <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">{label}</span>
      </div>
      <span className="text-[12px] font-medium text-text-muted">{count}</span>
    </div>
  );
}

export function AccountsView({ accounts, transfers, todayTransfers }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<AccountEditTarget | null>(null);
  const [transferFromId, setTransferFromId] = useState<string | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);

  const accountOptions: AccountOption[] = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    currentBalance: a.currentBalance,
  }));

  const openTransfer = (fromId: string | null = null) => {
    setTransferFromId(fromId);
    setTransferOpen(true);
  };

  return (
    <>
      <AddAccountModal
        open={addOpen || !!editTarget}
        onClose={() => { setAddOpen(false); setEditTarget(null); }}
        editTarget={editTarget}
      />

      <TransferFundsModal
        open={transferOpen}
        onClose={() => { setTransferOpen(false); setTransferFromId(null); }}
        accounts={accountOptions}
        prefilledFromId={transferFromId}
      />

      {/* Toolbar */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => openTransfer(null)}
          className="flex h-9 items-center gap-2 rounded-[9px] border border-border bg-surface px-4 text-[13px] font-medium text-text-secondary transition-colors hover:text-text-primary"
        >
          <ArrowLeftRight className="h-4 w-4" />
          Transfer Funds
        </button>
        <button
          onClick={() => setAddOpen(true)}
          className="flex h-9 items-center gap-2 rounded-[9px] bg-accent px-4 text-[13px] font-semibold text-accent-foreground transition-opacity hover:opacity-90"
          style={{ boxShadow: "0 1px 2px rgba(225,29,72,0.20), 0 4px 12px -4px rgba(225,29,72,0.40)" }}
        >
          <Plus className="h-4 w-4" />
          Add method
        </button>
      </div>

      {/* Active Methods */}
      <section className="mb-7">
        <SectionHeader icon={CreditCard} label="Active methods" count={accounts.filter((a) => a.isActive).length} />
        {accounts.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-[20px] border border-border bg-surface py-14"
            style={{ boxShadow: "0 1px 2px rgba(26,20,20,0.05), 0 4px 16px -8px rgba(26,20,20,0.10)" }}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-accent-light">
              <CreditCard className="h-6 w-6 text-accent" />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-semibold text-text-primary">No payment methods yet</p>
              <p className="mt-1 text-[13px] text-text-secondary">Add cash, bank, or wallet accounts.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((a) => (
              <AccountCard
                key={a.id}
                account={a}
                onEdit={() =>
                  setEditTarget({
                    id: a.id,
                    name: a.name,
                    type: a.type,
                    openingBalance: String(a.openingBalance),
                  })
                }
                onTransfer={() => openTransfer(a.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Today's Transactions */}
      <section className="mb-7">
        <SectionHeader icon={DollarSign} label="Today's transactions" count={todayTransfers.length} />
        <div
          className="rounded-[20px] border border-border bg-surface"
          style={{ boxShadow: "0 1px 2px rgba(26,20,20,0.05), 0 4px 16px -8px rgba(26,20,20,0.10)" }}
        >
          {todayTransfers.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-text-muted">No transactions today yet.</p>
          ) : (
            <TransfersTable rows={todayTransfers} />
          )}
        </div>
      </section>

      {/* All Transactions */}
      <section>
        <SectionHeader icon={Clock} label="Transactions" count={transfers.length} />
        <div
          className="rounded-[20px] border border-border bg-surface"
          style={{ boxShadow: "0 1px 2px rgba(26,20,20,0.05), 0 4px 16px -8px rgba(26,20,20,0.10)" }}
        >
          {transfers.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-text-muted">No transfers yet.</p>
          ) : (
            <TransfersTable rows={transfers} showPagination />
          )}
        </div>
      </section>
    </>
  );
}

/* ─── Account Card ────────────────────────────────────────────── */

function AccountCard({
  account,
  onEdit,
  onTransfer,
}: {
  account: AccountRow;
  onEdit: () => void;
  onTransfer: () => void;
}) {
  return (
    <div
      className="flex flex-col rounded-[20px] border border-border bg-surface p-5"
      style={{ boxShadow: "0 1px 2px rgba(26,20,20,0.05), 0 4px 16px -8px rgba(26,20,20,0.10)" }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <p className="font-display text-[15px] font-bold uppercase tracking-wide text-text-primary">
          {account.name}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={onTransfer}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-text-muted transition-colors hover:bg-accent-light hover:text-accent"
            aria-label="Transfer from this account"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-text-muted transition-colors hover:bg-accent-light hover:text-accent"
            aria-label="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <form
            action={async (fd: FormData) => { await deleteAccount(null, fd); }}
            onSubmit={(e) => {
              if (!window.confirm(`Delete "${account.name}"? This cannot be undone.`)) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={account.id} />
            <SubmitButton
              pendingLabel=""
              spinnerClassName="h-3.5 w-3.5"
              className="flex h-8 w-8 items-center justify-center rounded-[8px] text-text-muted transition-colors hover:bg-error-light hover:text-error disabled:opacity-60"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </SubmitButton>
          </form>
        </div>
      </div>

      {/* Opening */}
      <div className="mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Opening</p>
        <p className="mt-0.5 text-[13px] font-medium text-text-secondary">
          {account.openingBalance > 0 ? `Rs ${Math.round(account.openingBalance).toLocaleString("en-PK")}` : "Rs 0"}
        </p>
      </div>

      {/* Current balance */}
      <div className="mt-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Current balance</p>
        <p
          className={`font-display mt-1 text-[26px] font-bold leading-none ${
            account.currentBalance < 0 ? "text-error" : "text-text-primary"
          }`}
        >
          {`Rs ${Math.round(account.currentBalance).toLocaleString("en-PK")}`}
        </p>
      </div>
    </div>
  );
}

/* ─── Transfers Table ─────────────────────────────────────────── */

function TransfersTable({ rows, showPagination }: { rows: TransferRow[]; showPagination?: boolean }) {
  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {["Date", "From", "To", "Amount", "Note"].map((h) => (
              <th key={h} className="px-4 py-3.5 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted first:pl-5">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id} className={`transition-colors hover:bg-surface-muted ${i < rows.length - 1 ? "border-b border-border" : ""}`}>
              <td className="pl-5 pr-4 py-3.5">
                <span className="text-[12px] text-text-muted">{fmtDate(row.transferredAt)}</span>
              </td>
              <td className="px-4 py-3.5">
                <span className="text-[13px] font-semibold text-text-primary">{row.fromName}</span>
              </td>
              <td className="px-4 py-3.5">
                <span className="text-[13px] font-semibold text-text-primary">{row.toName}</span>
              </td>
              <td className="px-4 py-3.5">
                <span className="text-[13px] font-semibold text-error">Rs {Math.round(row.amount).toLocaleString("en-PK")}</span>
              </td>
              <td className="px-4 py-3.5">
                <span className="text-[13px] text-text-muted">{row.note ?? "—"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {showPagination && (
        <div className="border-t border-border px-5 py-3">
          <p className="text-[12px] text-text-muted">
            Showing <strong>1–{rows.length}</strong> of <strong>{rows.length}</strong> {rows.length === 1 ? "transaction" : "transactions"}
          </p>
        </div>
      )}
    </div>
  );
}
