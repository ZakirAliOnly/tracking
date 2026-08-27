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
      type: formData.get("type"),
      supplierId: formData.get("supplierId") || null,
      openingStock: formData.get("openingStock") || undefined,
      costPrice: formData.get("costPrice") || undefined,
      salePrice: formData.get("salePrice") || undefined,
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const d = parsed.data;
    const quantity = d.openingStock ? parseInt(d.openingStock, 10) : 0;
    const costPrice = d.costPrice ? parseFloat(d.costPrice) : null;
    const salePrice = d.salePrice ? parseFloat(d.salePrice) : null;
    const supplierId = d.supplierId || null;

    // There is exactly one Device pool and one Sim pool per org — adding a
    // second stock line of the same type tops that pool up rather than
    // splitting it, the same bulk line CSV import and the entry forms draw from
    const existing = await prisma.device.findFirst({
      where: { orgId, type: d.type, imeiNo: null },
      select: { id: true },
    });

    if (existing) {
      await prisma.$executeRaw`
        UPDATE devices
        SET
          quantity = quantity + ${quantity},
          cost_price = COALESCE(${costPrice}, cost_price),
          sale_price = COALESCE(${salePrice}, sale_price),
          supplier_id = COALESCE(${supplierId}, supplier_id)
        WHERE id = ${existing.id}
          AND org_id = ${orgId}
      `;
    } else {
      const id = randomUUID();
      await prisma.$executeRaw`
        INSERT INTO devices (id, org_id, type, fm_module, supplier_id, quantity, cost_price, sale_price, status, created_at)
        VALUES (
          ${id},
          ${orgId},
          ${d.type},
          ${d.fmModule},
          ${supplierId},
          ${quantity},
          ${costPrice},
          ${salePrice},
          'in_stock',
          NOW()
        )
      `;
    }

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

    // Editing a device is a price change only — `status` is left alone, since
    // it is moved by stock movement (fitting a device) rather than by hand
    await prisma.$executeRaw`
      UPDATE devices
      SET
        cost_price = ${costPrice},
        sale_price = ${salePrice}
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
