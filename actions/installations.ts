"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { installationBatchSchema } from "@/lib/validations/installation";

export type InstallationActionState = {
  success: boolean;
  error?: string;
  count?: number;
} | null;

export async function createInstallations(
  _prevState: InstallationActionState,
  formData: FormData
): Promise<InstallationActionState> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };
    const { orgId } = session.user;

    let devicesJson: unknown;
    try {
      devicesJson = JSON.parse((formData.get("devices") as string) ?? "[]");
    } catch {
      return { success: false, error: "Invalid form data." };
    }

    const parsed = installationBatchSchema.safeParse({
      customerId: formData.get("customerId"),
      installationDate: formData.get("installationDate"),
      nextRenewalDate: formData.get("nextRenewalDate"),
      accountId: formData.get("accountId") || null,
      discount: formData.get("discount") || undefined,
      amountPaid: formData.get("amountPaid") || undefined,
      devices: devicesJson,
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const { customerId, installationDate, nextRenewalDate, accountId, discount, amountPaid, devices } = parsed.data;
    const installDate = new Date(installationDate ?? new Date().toISOString().slice(0, 10));
    const renewalDate = nextRenewalDate
      ? new Date(nextRenewalDate)
      : new Date(new Date().setFullYear(new Date().getFullYear() + 1));
    const totalDiscount = parseFloat(discount ?? "0") || 0;
    const totalAmountPaid = parseFloat(amountPaid ?? "0") || 0;
    const n = devices.length;

    // Distribute discount and amountPaid proportionally across devices
    const discountPer = n > 0 ? totalDiscount / n : 0;
    const paidPer = n > 0 ? totalAmountPaid / n : 0;

    for (const row of devices) {
      // Verify the device belongs to this org and is in stock
      const stockDevice = await prisma.device.findFirst({
        where: { id: row.deviceId, orgId },
      });
      if (!stockDevice) {
        return { success: false, error: `Device not found in your stock.` };
      }

      const salePrice = parseFloat(row.salePrice ?? "") || Number(stockDevice.salePrice ?? 0);
      const installId = randomUUID();

      // Wrap all writes in a transaction so nothing commits if any step fails
      await prisma.$transaction(async (tx) => {
        const vehicle = await tx.vehicle.upsert({
          where: { orgId_registrationNo: { orgId, registrationNo: row.registrationNo } },
          create: {
            orgId,
            customerId,
            registrationNo: row.registrationNo,
            make: row.vehicleMake || null,
            model: row.vehicleModel || null,
            colour: row.vehicleColour || null,
          },
          update: {
            customerId,
            make: row.vehicleMake || null,
            model: row.vehicleModel || null,
            colour: row.vehicleColour || null,
          },
        });

        // Create a new device record for this specific installed unit (with its own IMEI)
        const installedDevice = await tx.device.create({
          data: {
            orgId,
            supplierId: stockDevice.supplierId ?? null,
            imeiNo: row.imeiNo || null,
            gsmNo: row.gsmNo || stockDevice.gsmNo || null,
            gsmNoAlt: stockDevice.gsmNoAlt ?? null,
            fmModule: stockDevice.fmModule ?? null,
            cutOff: stockDevice.cutOff ?? null,
            costPrice: stockDevice.costPrice ?? null,
            salePrice: salePrice,
            quantity: 0,
            status: "installed",
          },
        });

        // Decrement stock; mark as installed when stock runs out
        await tx.device.update({
          where: { id: stockDevice.id },
          data: {
            quantity: { decrement: 1 },
            status: stockDevice.quantity <= 1 ? "installed" : stockDevice.status,
          },
        });

        // Use $executeRaw to avoid stale-client issues with new discount/amount_paid columns
        await tx.$executeRaw`
          INSERT INTO installations (
            id, org_id, customer_id, vehicle_id, device_id, account_id,
            installation_date, installation_pay, sim_payment, device_payment, net_payment,
            discount, amount_paid, next_renewal_date, status, created_at
          ) VALUES (
            ${installId}, ${orgId}, ${customerId}, ${vehicle.id}, ${installedDevice.id},
            ${accountId || null},
            ${installDate}::date, 0, 0, ${salePrice}, 0,
            ${discountPer}, ${paidPer},
            ${renewalDate}::date, 'active', NOW()
          )
        `;
      });
    }

    revalidatePath("/installations");
    revalidatePath("/stock");
    return { success: true, count: devices.length };
  } catch (error) {
    console.error("[actions/installations]", error);
    return { success: false, error: "Failed to save installations. Please try again." };
  }
}
