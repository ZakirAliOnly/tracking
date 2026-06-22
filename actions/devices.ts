"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addDeviceSchema, updateDeviceSchema } from "@/lib/validations/device";

export type DeviceActionState = { success: boolean; error?: string } | null;

export async function addDevice(
  _prevState: DeviceActionState,
  formData: FormData
): Promise<DeviceActionState> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };
    const { orgId } = session.user;

    const parsed = addDeviceSchema.safeParse({
      fmModule: formData.get("fmModule"),
      supplierId: formData.get("supplierId") || null,
      openingStock: formData.get("openingStock") || undefined,
      costPrice: formData.get("costPrice") || undefined,
      salePrice: formData.get("salePrice") || undefined,
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const d = parsed.data;
    const id = randomUUID();
    const quantity = d.openingStock ? parseInt(d.openingStock, 10) : 0;
    const costPrice = d.costPrice ? parseFloat(d.costPrice) : null;
    const salePrice = d.salePrice ? parseFloat(d.salePrice) : null;
    const supplierId = d.supplierId || null;

    await prisma.$executeRaw`
      INSERT INTO devices (id, org_id, fm_module, supplier_id, quantity, cost_price, sale_price, status, created_at)
      VALUES (
        ${id},
        ${orgId},
        ${d.fmModule},
        ${supplierId},
        ${quantity},
        ${costPrice},
        ${salePrice},
        'in_stock',
        NOW()
      )
    `;

    revalidatePath("/stock");
    return { success: true };
  } catch (error) {
    console.error("[actions/devices/add]", error);
    return { success: false, error: "Failed to add device. Please try again." };
  }
}

export async function updateDevice(
  _prevState: DeviceActionState,
  formData: FormData
): Promise<DeviceActionState> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };
    const { orgId } = session.user;

    const parsed = updateDeviceSchema.safeParse({
      id: formData.get("id"),
      costPrice: formData.get("costPrice") || undefined,
      salePrice: formData.get("salePrice") || undefined,
      markFaulty: formData.get("markFaulty") || undefined,
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const d = parsed.data;

    const existing = await prisma.device.findFirst({
      where: { id: d.id, orgId },
    });
    if (!existing) return { success: false, error: "Device not found." };

    const costPrice = d.costPrice !== undefined ? parseFloat(d.costPrice) : existing.costPrice;
    const salePrice = d.salePrice !== undefined ? parseFloat(d.salePrice) : existing.salePrice;
    const newStatus = d.markFaulty === "true" ? "faulty" : existing.status;

    await prisma.$executeRaw`
      UPDATE devices
      SET
        cost_price = ${costPrice},
        sale_price = ${salePrice},
        status = ${newStatus}
      WHERE id = ${d.id}
        AND org_id = ${orgId}
    `;

    revalidatePath("/stock");
    return { success: true };
  } catch (error) {
    console.error("[actions/devices/update]", error);
    return { success: false, error: "Failed to update device. Please try again." };
  }
}
