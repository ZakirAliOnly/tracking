import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 11, "Phone number must be exactly 11 digits"),
  address: z.string().optional(),
  remarks: z.string().optional(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
