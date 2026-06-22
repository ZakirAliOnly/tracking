"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerSchema } from "@/lib/validations/customer";

export type SaveCustomerState = { success: boolean; error?: string } | null;

export async function upsertCustomer(
  _prevState: SaveCustomerState,
  formData: FormData
): Promise<SaveCustomerState> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };

    const { orgId } = session.user;
    const id = formData.get("id") as string | null;

    const parsed = customerSchema.safeParse({
      name: formData.get("name"),
      phone: formData.get("phone"),
      address: formData.get("address") || undefined,
      remarks: formData.get("remarks") || undefined,
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const data = {
      name: parsed.data.name,
      phone: parsed.data.phone,
      address: parsed.data.address ?? null,
      remarks: parsed.data.remarks ?? null,
    };

    if (id) {
      await prisma.customer.update({ where: { id, orgId }, data });
    } else {
      await prisma.customer.create({ data: { orgId, ...data } });
    }

    revalidatePath("/customers");
    return { success: true };
  } catch (error) {
    console.error("[actions/customers]", error);
    return { success: false, error: "Failed to save customer. Please try again." };
  }
}
