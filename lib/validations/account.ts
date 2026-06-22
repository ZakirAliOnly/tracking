import { z } from "zod";

export const addAccountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["cash", "bank", "wallet"]).default("cash"),
  openingBalance: z.string().optional(),
});

export const editAccountSchema = addAccountSchema.extend({
  id: z.string().min(1),
});

export const transferFundsSchema = z.object({
  fromId: z.string().min(1, "Source account is required"),
  toId: z.string().min(1, "Destination account is required"),
  amount: z.string().min(1, "Amount is required"),
  transferredAt: z.string().min(1, "Date is required"),
  note: z.string().optional(),
});

export type AddAccountInput = z.infer<typeof addAccountSchema>;
export type TransferFundsInput = z.infer<typeof transferFundsSchema>;
