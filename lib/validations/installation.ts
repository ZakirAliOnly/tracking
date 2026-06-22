import { z } from "zod";

const deviceRowSchema = z.object({
  deviceId: z.string().min(1, "Device is required"),
  imeiNo: z.string().min(1, "IMEI number is required for each device"),
  gsmNo: z.string().optional(),
  registrationNo: z.string().min(1, "Registration number is required"),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  vehicleColour: z.string().optional(),
  salePrice: z.string().optional(),
});

export const installationBatchSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  installationDate: z.string().optional(),
  nextRenewalDate: z.string().optional(),
  accountId: z.string().nullable().optional(),
  discount: z.string().optional(),
  amountPaid: z.string().optional(),
  devices: z.array(deviceRowSchema).min(1, "At least one device is required"),
});

export type DeviceRowInput = z.infer<typeof deviceRowSchema>;
export type InstallationBatchInput = z.infer<typeof installationBatchSchema>;
