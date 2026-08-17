"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveInstallationAccount } from "@/lib/accounts";
import { resolveInstallationDevices } from "@/lib/devices";
import { resolvePayment } from "@/lib/installation-money";
import { writeInstallation } from "@/lib/installation-write";
import { installationFormSchema, toDeviceLines } from "@/lib/validations/import";

export type InstallationActionState = {
  success: boolean;
  error?: string;
} | null;

export async function createInstallations(
  _prevState: InstallationActionState,
  formData: FormData
): Promise<InstallationActionState> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };
    const { orgId } = session.user;

    const parsed = installationFormSchema.safeParse({
      customerName: formData.get("customerName"),
      registrationNo: formData.get("registrationNo"),
      installationDate: formData.get("installationDate"),
      deviceIds: formData.getAll("deviceId").map(String),
      deviceQuantities: formData.getAll("deviceQuantity").map(String),
      amount: formData.get("amount") ?? undefined,
      simPayment: formData.get("simPayment") ?? undefined,
      discountMode: formData.get("discountMode") ?? undefined,
      discountValue: formData.get("discountValue") ?? undefined,
      amountPaid: formData.get("amountPaid") ?? undefined,
      simNo: formData.get("simNo") ?? undefined,
      accountId: formData.get("accountId") ?? undefined,
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const input = parsed.data;

    const account = await resolveInstallationAccount(orgId, input.accountId);
    if (!account.ok) return { success: false, error: account.error };

    const devices = await resolveInstallationDevices(
      orgId,
      toDeviceLines(input.deviceIds, input.deviceQuantities)
    );
    if (!devices.ok) return { success: false, error: devices.error };

    const payment = resolvePayment(input);

    // Resolved by name, the same rule the CSV import uses — no match creates one
    const existing = await prisma.customer.findFirst({
      where: { orgId, name: { equals: input.customerName, mode: "insensitive" } },
      select: { id: true },
    });

    await prisma.$transaction((tx) =>
      writeInstallation(tx, orgId, {
        customerId: existing?.id ?? null,
        customerName: input.customerName,
        registrationNo: input.registrationNo,
        installationDate: input.installationDate,
        received: payment.received,
        amount: input.amount,
        simPayment: input.simPayment,
        simNo: input.simNo,
        accountId: account.accountId,
        devices: devices.lines,
        discount: payment.discount,
        amountPaid: payment.amountPaid,
      })
    );

    revalidatePath("/installations");
    revalidatePath("/customers");
    revalidatePath("/renewals");
    revalidatePath("/payment-methods");
    revalidatePath("/stock");
    return { success: true };
  } catch (error) {
    console.error("[actions/installations]", error);
    return { success: false, error: "Failed to save the installation. Please try again." };
  }
}
