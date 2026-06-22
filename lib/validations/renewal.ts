import { z } from "zod";

export const recordRenewalSchema = z.object({
  installationId: z.string().min(1, "Installation is required"),
  accountId: z.string().nullable().optional(),
  amount: z.string().min(1, "Amount is required"),
  simOsting: z.string().optional(),
  net: z.string().optional(),
  other: z.string().optional(),
  otherNote: z.string().optional(),
  renewedAt: z.string().min(1, "Payment date is required"),
  nextRenewalDate: z.string().min(1, "Next renewal date is required"),
});

export type RecordRenewalInput = z.infer<typeof recordRenewalSchema>;
