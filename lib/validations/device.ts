import { z } from "zod";

export const addDeviceSchema = z.object({
  fmModule: z.string().min(1, "Device name is required"),
  // Which of the org's two bulk pools this stock belongs to — not editable
  // after creation, since it decides which pool CSV import and entry forms draw from
  type: z.enum(["device", "sim"], { message: "Choose Device or Sim" }),
  supplierId: z.string().optional().nullable(),
  openingStock: z.string().optional(),
  costPrice: z.string().optional(),
  salePrice: z.string().optional(),
});

export const updateDeviceSchema = z.object({
  id: z.string().min(1),
  costPrice: z.string().optional(),
  salePrice: z.string().optional(),
});

export type AddDeviceInput = z.infer<typeof addDeviceSchema>;
export type UpdateDeviceInput = z.infer<typeof updateDeviceSchema>;
