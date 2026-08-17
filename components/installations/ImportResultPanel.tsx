import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { ImportSummary } from "@/actions/import";

type Props = {
  summary: ImportSummary;
};

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "created" | "updated" | "failed";
}) {
  const toneClass =
    tone === "created"
      ? "text-success-foreground"
      : tone === "failed"
        ? "text-error-foreground"
        : "text-accent-dark";

  return (
    <div className="flex-1 rounded-[12px] border border-border bg-surface px-4 py-3">
      <p className={`font-display text-[22px] font-bold leading-7 ${toneClass}`}>{value}</p>
      <p className="text-[12.5px] text-text-secondary">{label}</p>
    </div>
  );
}

export function ImportResultPanel({ summary }: Props) {
  const allGood = summary.failed === 0;

  return (
    <div className="flex flex-col gap-4">
      <div
        className={`flex items-start gap-3 rounded-[12px] px-4 py-3 ${
          allGood ? "bg-success-light" : "bg-warning-light"
        }`}
      >
        {allGood ? (
          <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] flex-none text-success-foreground" />
        ) : (
          <AlertCircle className="mt-0.5 h-[18px] w-[18px] flex-none text-warning-foreground" />
        )}
        <p
          className={`text-[13px] font-medium ${
            allGood ? "text-success-foreground" : "text-warning-foreground"
          }`}
        >
          {allGood
            ? `Import finished — ${summary.created + summary.updated} row${
                summary.created + summary.updated === 1 ? "" : "s"
              } saved.`
            : `Import finished with ${summary.failed} row${
                summary.failed === 1 ? "" : "s"
              } skipped. Everything else was saved.`}
        </p>
      </div>

      <div className="flex gap-3">
        <Stat label="Newly created" value={summary.created} tone="created" />
        <Stat label="Updated" value={summary.updated} tone="updated" />
        <Stat label="Skipped" value={summary.failed} tone="failed" />
      </div>

      {summary.customersCreated > 0 && (
        <div className="rounded-[12px] border border-border bg-surface-muted px-4 py-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            Also added
          </p>
          <p className="text-[13px] text-text-secondary">
            {summary.customersCreated} new customer{summary.customersCreated === 1 ? "" : "s"}
          </p>
        </div>
      )}

      {summary.errors.length > 0 && (
        <div className="overflow-hidden rounded-[12px] border border-border">
          <div className="border-b border-border bg-surface-muted px-4 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Skipped rows
            </p>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {summary.errors.map((rowError, i) => (
              <div
                key={`${rowError.line}-${i}`}
                className={`flex gap-3 px-4 py-2.5 ${
                  i < summary.errors.length - 1 ? "border-b border-border-light" : ""
                }`}
              >
                <span className="flex-none font-mono text-[12.5px] font-medium text-text-muted">
                  Line {rowError.line}
                </span>
                <span className="text-[13px] text-text-secondary">{rowError.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
