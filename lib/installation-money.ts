export type DiscountMode = "fixed" | "percent";

export type PaymentInput = {
  amount: number;
  simPayment: number;
  discountMode: DiscountMode;
  discountValue: number;
  amountPaid: number;
};

export type PaymentBreakdown = {
  /** Installation charge + SIM charge, before any discount. */
  total: number;
  /** Always in rupees — a percentage is resolved here and never stored as one. */
  discount: number;
  payable: number;
  amountPaid: number;
  remaining: number;
  /** Nothing left to collect. Replaces the old hand-ticked checkbox. */
  received: boolean;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The one place the money on an installation is worked out, shared by the entry
 * forms (for the live summary) and the Server Actions (for what gets stored),
 * so the figure staff see is the figure saved. Deliberately free of imports so
 * client components can use it.
 */
export function resolvePayment(input: PaymentInput): PaymentBreakdown {
  const total = round2(Math.max(0, input.amount) + Math.max(0, input.simPayment));

  const rawDiscount =
    input.discountMode === "percent"
      ? (total * Math.min(Math.max(input.discountValue, 0), 100)) / 100
      : Math.max(input.discountValue, 0);

  const discount = round2(Math.min(rawDiscount, total));
  const payable = round2(total - discount);
  const amountPaid = round2(Math.max(input.amountPaid, 0));

  return {
    total,
    discount,
    payable,
    amountPaid,
    remaining: round2(Math.max(payable - amountPaid, 0)),
    received: amountPaid >= payable,
  };
}
