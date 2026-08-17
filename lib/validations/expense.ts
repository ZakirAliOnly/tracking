import { z } from "zod";

export const addExpenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required"),
  accountId: z.string().optional().nullable(),
  spentAt: z.string().min(1, "Date is required"),
});

export type AddExpenseInput = z.infer<typeof addExpenseSchema>;
