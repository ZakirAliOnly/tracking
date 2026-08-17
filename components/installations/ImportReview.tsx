"use client";

import { useState } from "react";
import { ChevronDown, Copy, FilePlus2, PencilLine, XCircle } from "lucide-react";
import type { FieldDiff, ImportPlan, RowPlan } from "@/lib/import-plan";

type Props = {
  plan: ImportPlan;
};

const TONE = {
  create: { bg: "bg-success-light", text: "text-success-foreground" },
  update: { bg: "bg-accent-light", text: "text-accent-dark" },
  duplicate: { bg: "bg-warning-light", text: "text-warning-foreground" },
  invalid: { bg: "bg-error-light", text: "text-error-foreground" },
} as const;

export function ImportReview({ plan }: Props) {
  const duplicates = plan.rows.filter((r) => r.status === "duplicate");
  const invalid = plan.rows.filter((r) => r.status === "invalid");
  const updates = plan.rows.filter((r) => r.status === "update");

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-2">
        <Count icon={FilePlus2} label="New" value={plan.counts.create} tone="create" />
        <Count icon={PencilLine} label="Update" value={plan.counts.update} tone="update" />
        <Count icon={Copy} label="Duplicates" value={plan.counts.duplicate} tone="duplicate" />
        <Count icon={XCircle} label="Bad rows" value={plan.counts.invalid} tone="invalid" />
      </div>

      {duplicates.length > 0 && (
        <ProblemList
          title={`${duplicates.length} row${duplicates.length === 1 ? "" : "s"} duplicated inside the file`}
          subtitle="None of these are imported — fix the file and upload it again."
          rows={duplicates}
        />
      )}

      {invalid.length > 0 && (
        <ProblemList
          title={`${invalid.length} row${invalid.length === 1 ? "" : "s"} cannot be read`}
          subtitle="These are skipped."
          rows={invalid}
          tone="invalid"
        />
      )}

      {updates.length > 0 && <UpdateList rows={updates} />}
    </div>
  );
}

/* ─── Counts ───────────────────────────────────────────── */

function Count({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  tone: keyof typeof TONE;
}) {
  const dim = value === 0;
  return (
    <div
      className={`rounded-[12px] border border-border px-3 py-2.5 ${
        dim ? "bg-surface" : TONE[tone].bg
      }`}
    >
      <Icon className={`h-4 w-4 ${dim ? "text-text-muted" : TONE[tone].text}`} />
      <p
        className={`mt-1 font-display text-[19px] font-bold leading-6 ${
          dim ? "text-text-muted" : TONE[tone].text
        }`}
      >
        {value}
      </p>
      <p className="text-[11.5px] text-text-secondary">{label}</p>
    </div>
  );
}

/* ─── Diffs ────────────────────────────────────────────── */

function DiffTable({ diffs }: { diffs: FieldDiff[] }) {
  if (diffs.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-light">
            <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted" />
            <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Now
            </th>
            <th className="px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              After import
            </th>
          </tr>
        </thead>
        <tbody>
          {diffs.map((diff, i) => (
            <tr
              key={diff.label}
              className={i < diffs.length - 1 ? "border-b border-border-light" : ""}
            >
              <td className="whitespace-nowrap px-4 py-2 text-[12.5px] text-text-secondary">
                {diff.label}
              </td>
              <td className="whitespace-nowrap px-4 py-2 font-mono text-[12.5px] text-text-secondary">
                {diff.existing}
              </td>
              <td className="whitespace-nowrap px-4 py-2 font-mono text-[12.5px] font-semibold text-text-primary">
                {diff.incoming}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Lists ────────────────────────────────────────────── */

function ProblemList({
  title,
  subtitle,
  rows,
  tone = "duplicate",
}: {
  title: string;
  subtitle: string;
  rows: RowPlan[];
  tone?: "duplicate" | "invalid";
}) {
  return (
    <section className="overflow-hidden rounded-[12px] border border-border">
      <div className={`border-b border-border px-4 py-2.5 ${TONE[tone].bg}`}>
        <p className={`text-[12.5px] font-semibold ${TONE[tone].text}`}>{title}</p>
        <p className={`text-[12px] ${TONE[tone].text}/80`}>{subtitle}</p>
      </div>
      <div className="max-h-44 overflow-y-auto">
        {rows.map((row, i) => (
          <div
            key={row.line}
            className={`flex gap-3 px-4 py-2 ${i < rows.length - 1 ? "border-b border-border-light" : ""}`}
          >
            <span className="flex-none font-mono text-[12.5px] font-medium text-text-muted">
              Line {row.line}
            </span>
            <span className="text-[12.5px] text-text-secondary">{row.message}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function UpdateList({ rows }: { rows: RowPlan[] }) {
  const [open, setOpen] = useState(false);
  const changed = rows.filter((r) => r.diffs.length > 0);

  return (
    <section className="rounded-[12px] border border-border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-[13px] font-semibold text-text-primary">
          {rows.length} existing vehicle{rows.length === 1 ? "" : "s"} will be updated
          {changed.length > 0 && ` · ${changed.length} with changes`}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="max-h-72 overflow-y-auto border-t border-border">
          {changed.length === 0 ? (
            <p className="px-4 py-3 text-[12.5px] text-text-secondary">
              Every matching row is identical to what is already stored — nothing will change.
            </p>
          ) : (
            changed.map((row) => (
              <div key={row.line} className="border-b border-border-light last:border-b-0">
                <p className="px-4 pt-3 text-[12.5px] font-semibold text-text-primary">
                  Line {row.line} — {row.registrationNo}
                  <span className="font-normal text-text-secondary"> · {row.customerName}</span>
                </p>
                <DiffTable diffs={row.diffs} />
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
