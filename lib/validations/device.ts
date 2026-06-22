import { z } from "zod";

export const addDeviceSchema = z.object({
  fmModule: z.string().min(1, "Device name is required"),
  supplierId: z.string().optional().nullable(),
  openingStock: z.string().optional(),
  costPrice: z.string().optional(),
  salePrice: z.string().optional(),
});

export const updateDeviceSchema = z.object({
  id: z.string().min(1),
  costPrice: z.string().optional(),
  salePrice: z.string().optional(),
  markFaulty: z.enum(["true", "false"]).optional(),
});

export type AddDeviceInput = z.infer<typeof addDeviceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
