"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveInstallationAccount } from "@/lib/accounts";
import { resolveInstallationDevices } from "@/lib/devices";
import { resolvePayment } from "@/lib/installation-money";
import { writeInstallation } from "@/lib/installation-write";
import { newInstallationFormSchema, toDeviceLines, toFormContacts } from "@/lib/validations/import";

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

    const parsed = newInstallationFormSchema.safeParse({
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
      phone: formData.get("phone") ?? undefined,
      address: formData.get("address") ?? undefined,
      contact1Name: formData.get("contact1Name") ?? undefined,
      contact1Mobile: formData.get("contact1Mobile") ?? undefined,
      contact2Name: formData.get("contact2Name") ?? undefined,
      contact2Mobile: formData.get("contact2Mobile") ?? undefined,
      contact3Name: formData.get("contact3Name") ?? undefined,
      contact3Mobile: formData.get("contact3Mobile") ?? undefined,
      contact4Name: formData.get("contact4Name") ?? undefined,
      contact4Mobile: formData.get("contact4Mobile") ?? undefined,
      carDescription: formData.get("carDescription") ?? undefined,
      make: formData.get("make") ?? undefined,
      model: formData.get("model") ?? undefined,
      engineNo: formData.get("engineNo") ?? undefined,
      chassisNo: formData.get("chassisNo") ?? undefined,
      colour: formData.get("colour") ?? undefined,
      devicePayment: formData.get("devicePayment") ?? undefined,
      gsmNo: formData.get("gsmNo") ?? undefined,
      fmModule: formData.get("fmModule") ?? undefined,
      cutOff: formData.get("cutOff") ?? undefined,
      imeiNo: formData.get("imeiNo") ?? undefined,
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

    // An untouched section must leave what is already stored alone rather than
    // wiping it — unlike the CSV import, which treats every row as the sheet's
    // full, authoritative picture on every re-import
    const contacts = toFormContacts(input);

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
        devicePayment: input.devicePayment,
        customerDetail: {
          phone: input.phone,
          address: input.address,
          remarks: null,
          password: null,
        },
        contacts: contacts.length > 0 ? contacts : undefined,
        vehicleDetail: {
          description: input.carDescription,
          make: input.make,
          model: input.model,
          engineNo: input.engineNo,
          chassisNo: input.chassisNo,
          colour: input.colour,
        },
        gsmNo: input.gsmNo ?? undefined,
        fmModule: input.fmModule ?? undefined,
        cutOff: input.cutOff ?? undefined,
        imeiNo: input.imeiNo ?? undefined,
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

/**
 * Records a further payment against an installation's outstanding balance.
 *
 * The ceiling is recomputed here from the stored figures rather than trusting
 * whatever the browser said was remaining — the form's `max` is a convenience,
 * not the rule. Paying the balance off exactly is what flips `received`, using
 * the same `amountPaid >= payable` test the entry forms use.
 */
export async function payInstallationBalance(
  _prevState: InstallationActionState,
  formData: FormData
): Promise<InstallationActionState> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };
    const { orgId } = session.user;

    const id = String(formData.get("installationId") ?? "");
    if (!id) return { success: false, error: "Installation is required." };

    const raw = String(formData.get("amount") ?? "").replace(/[,\s]/g, "");
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount <= 0) {
      return { success: false, error: "Enter an amount greater than 0." };
    }

    const installation = await prisma.installation.findFirst({
      where: { id, orgId },
      select: { id: true, totalAmount: true, discount: true, amountPaid: true },
    });
    if (!installation) return { success: false, error: "That installation was not found." };

    const payable = Math.max(
      Number(installation.totalAmount ?? 0) - Number(installation.discount),
      0
    );
    const alreadyPaid = Number(installation.amountPaid);
    const owed = Math.round(Math.max(payable - alreadyPaid, 0) * 100) / 100;

    if (owed <= 0) return { success: false, error: "This installation is already settled." };
    if (amount > owed) {
      return {
        success: false,
        error: `That is more than the ${owed.toLocaleString("en-PK")} still owed.`,
      };
    }

    const nowPaid = Math.round((alreadyPaid + amount) * 100) / 100;

    await prisma.installation.update({
      where: { id: installation.id },
      data: { amountPaid: nowPaid, received: nowPaid >= payable },
    });

    revalidatePath("/installations");
    revalidatePath("/customers");
    revalidatePath("/payment-methods");
    return { success: true };
  } catch (error) {
    console.error("[actions/installations/pay]", error);
    return { success: false, error: "Failed to record the payment. Please try again." };
  }
}
