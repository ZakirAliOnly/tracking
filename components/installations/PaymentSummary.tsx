import type { PaymentBreakdown } from "@/lib/installation-money";

type Props = {
  money: PaymentBreakdown;
};

function fmtRs(v: number): string {
  return `Rs ${Math.round(v).toLocaleString("en-PK")}`;
}

/** The running total on both installation entry forms. */
export function PaymentSummary({ money }: Props) {
  return (
    <div className="flex flex-col gap-2 rounded-[12px] border border-border bg-surface-muted px-4 py-3.5">
      <Line label="Total" value={fmtRs(money.total)} />

      {money.discount > 0 && (
        <Line label="Discount" value={`− ${fmtRs(money.discount)}`} tone="success" />
      )}

      <div className="flex items-center justify-between border-t border-border pt-2">
        <span className="text-[13px] font-semibold text-text-primary">Payable</span>
        <span className="font-mono text-[15px] font-bold text-text-primary">
          {fmtRs(money.payable)}
        </span>
      </div>

      <Line label="Paid" value={fmtRs(money.amountPaid)} />

      {money.received ? (
        <div className="flex items-center justify-between">
          <span className="text-[12px] font-medium text-text-secondary">Remaining</span>
          <span className="text-[12px] font-semibold text-success-foreground">Fully paid</span>
        </div>
      ) : (
        <Line label="Remaining" value={fmtRs(money.remaining)} tone="warning" />
      )}
    </div>
  );
}

function Line({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning";
}) {
  const valueTone =
    tone === "success"
      ? "text-success-foreground"
      : tone === "warning"
        ? "text-warning-foreground"
        : "text-text-primary";

  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] font-medium text-text-secondary">{label}</span>
      <span className={`font-mono text-[13px] font-semibold ${valueTone}`}>{value}</span>
    </div>
  );
}
