"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolvePayingAccount } from "@/lib/accounts";
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

    const payment = resolvePayment(input);

    // A method is only named when money actually moved: something was paid AND
    // the job is worth something. A zero-total installation names no account
    const moneyIn = payment.total > 0 ? payment.amountPaid : 0;
    const account = await resolvePayingAccount(orgId, input.accountId, moneyIn, "in");
    if (!account.ok) return { success: false, error: account.error };

    // Editing reuses this same action (registration number upserts in place).
    // Stock already has this installation's current units subtracted out, so
    // checking availability as-is would wrongly refuse re-selecting the same
    // device — a negative "reserved" hands those units back before checking
    // Only a non-trashed installation counts as "existing" here — a trashed
    // one must be brought back through Restore, not silently resurrected by
    // re-entering its registration number on this form
    const existingVehicle = await prisma.vehicle.findFirst({
      where: { orgId, registrationNo: { equals: input.registrationNo, mode: "insensitive" } },
      select: {
        installations: {
          where: { deletedAt: null },
          select: { devices: { select: { deviceId: true, quantity: true } } },
        },
      },
    });
    const heldByThisInstallation = new Map<string, number>();
    for (const line of existingVehicle?.installations[0]?.devices ?? []) {
      const current = heldByThisInstallation.get(line.deviceId) ?? 0;
      heldByThisInstallation.set(line.deviceId, current - line.quantity);
    }

    const devices = await resolveInstallationDevices(
      orgId,
      toDeviceLines(input.deviceIds, input.deviceQuantities),
      heldByThisInstallation
    );
    if (!devices.ok) return { success: false, error: devices.error };

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
 * Deletes an installation entirely, along with its renewal history and
 * fitted-device lines. Any devices still fitted are returned to Stock first —
 * the same `moveStock` logic a form edit uses, just against an empty "next"
 * list — so deleting a record never leaves stock silently short.
 */
/**
 * Soft-deletes an installation — sets `deletedAt` rather than removing the
 * row, so it (and its renewal history, payments and device lines, all left
 * untouched) can be restored later from the Trash view. Fitted devices are
 * returned to Stock immediately, since a trashed installation is not an
 * active job and those units should not sit idle and unusable; restoring
 * re-deducts them, refusing if that stock is no longer available.
 */
export async function trashInstallation(
  _prevState: InstallationActionState,
  formData: FormData
): Promise<InstallationActionState> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };
    const { orgId } = session.user;

    const id = String(formData.get("id") ?? "");
    if (!id) return { success: false, error: "Installation is required." };

    const installation = await prisma.installation.findFirst({
      where: { id, orgId, deletedAt: null },
      select: {
        id: true,
        devices: { select: { deviceId: true, quantity: true } },
      },
    });
    if (!installation) return { success: false, error: "That installation was not found." };

    await prisma.$transaction(async (tx) => {
      for (const line of installation.devices) {
        await tx.device.updateMany({
          where: { id: line.deviceId, orgId },
          data: { quantity: { increment: line.quantity } },
        });
      }
      await tx.installation.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    });

    revalidatePath("/installations");
    revalidatePath("/customers");
    revalidatePath("/renewals");
    revalidatePath("/payment-methods");
    revalidatePath("/stock");
    revalidatePath("/sales-report");
    return { success: true };
  } catch (error) {
    console.error("[actions/installations/trash]", error);
    return { success: false, error: "Failed to delete the installation. Please try again." };
  }
}

/**
 * Brings a trashed installation back — clears `deletedAt` and re-deducts its
 * fitted devices from Stock, exactly as if they were being fitted again.
 * Refuses cleanly (leaving it in Trash) if any of those units are no longer
 * available, rather than restoring a job that Stock cannot actually support.
 */
export async function restoreInstallation(
  _prevState: InstallationActionState,
  formData: FormData
): Promise<InstallationActionState> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };
    const { orgId } = session.user;

    const id = String(formData.get("id") ?? "");
    if (!id) return { success: false, error: "Installation is required." };

    const installation = await prisma.installation.findFirst({
      where: { id, orgId, deletedAt: { not: null } },
      select: {
        id: true,
        devices: { select: { deviceId: true, quantity: true } },
      },
    });
    if (!installation) return { success: false, error: "That installation was not found in Trash." };

    await prisma.$transaction(async (tx) => {
      for (const line of installation.devices) {
        const device = await tx.device.findFirst({
          where: { id: line.deviceId, orgId },
          select: { fmModule: true, quantity: true },
        });
        if (!device || device.quantity < line.quantity) {
          throw new Error(
            `Not enough stock to restore this installation — ${device?.fmModule ?? "one of its devices"} is short ${line.quantity - (device?.quantity ?? 0)} unit(s).`
          );
        }
      }
      for (const line of installation.devices) {
        await tx.device.updateMany({
          where: { id: line.deviceId, orgId },
          data: { quantity: { decrement: line.quantity } },
        });
      }
      await tx.installation.update({
        where: { id },
        data: { deletedAt: null },
      });
    });

    revalidatePath("/installations");
    revalidatePath("/customers");
    revalidatePath("/renewals");
    revalidatePath("/payment-methods");
    revalidatePath("/stock");
    revalidatePath("/sales-report");
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error("[actions/installations/restore]", error);
    return {
      success: false,
      error: message.startsWith("Not enough stock")
        ? message
        : "Failed to restore the installation. Please try again.",
    };
  }
}

/**
 * The real, permanent delete — only reachable from the Trash view, and only
 * on an already-trashed installation. Cascades away its renewal history,
 * payment records and device lines for good; there is no undo past this.
 * Stock is not touched here since trashing already returned those units.
 */
export async function permanentlyDeleteInstallation(
  _prevState: InstallationActionState,
  formData: FormData
): Promise<InstallationActionState> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };
    const { orgId } = session.user;

    const id = String(formData.get("id") ?? "");
    if (!id) return { success: false, error: "Installation is required." };

    const installation = await prisma.installation.findFirst({
      where: { id, orgId, deletedAt: { not: null } },
      select: { id: true },
    });
    if (!installation) return { success: false, error: "That installation was not found in Trash." };

    await prisma.$transaction([
      // Renewal has no cascade on installation_id (unlike InstallationPayment
      // and ImeiChangeLog, which do) — deleted explicitly so the FK does not
      // block the installation row itself from going away
      prisma.renewal.deleteMany({ where: { installationId: id, orgId } }),
      prisma.installation.delete({ where: { id } }),
    ]);

    revalidatePath("/installations");
    return { success: true };
  } catch (error) {
    console.error("[actions/installations/permanent-delete]", error);
    return { success: false, error: "Failed to permanently delete the installation. Please try again." };
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
export type SaleSearchResult = {
  id: string;
  registrationNo: string;
  customerName: string;
  amount: string;
  simPayment: string;
  devicePayment: string;
};

/** Registration-number lookup that feeds the Sales Report edit modal's dropdown. */
export async function searchInstallationsByReg(query: string): Promise<SaleSearchResult[]> {
  const session = await auth();
  if (!session) return [];
  const { orgId } = session.user;

  const q = query.trim();
  if (!q) return [];

  const rows = await prisma.installation.findMany({
    where: {
      orgId,
      deletedAt: null,
      vehicle: { registrationNo: { contains: q, mode: "insensitive" } },
    },
    select: {
      id: true,
      installationPay: true,
      simPayment: true,
      devicePayment: true,
      customer: { select: { name: true } },
      vehicle: { select: { registrationNo: true } },
    },
    orderBy: { installationDate: "desc" },
    take: 10,
  });

  return rows.map((r) => ({
    id: r.id,
    registrationNo: r.vehicle.registrationNo,
    customerName: r.customer.name,
    amount: r.installationPay.toString(),
    simPayment: r.simPayment.toString(),
    devicePayment: r.devicePayment.toString(),
  }));
}

/**
 * Overwrites an installation's Amount / Sim / Device figures directly from the
 * Sales Report's edit modal. `totalAmount` is a generated column, so it and
 * `netPayment`/`otherAmount` are left untouched — this only ever touches the
 * three fields the Sales Report itself shows and computes Total Sale from.
 */
export async function updateSaleAmounts(
  _prevState: InstallationActionState,
  formData: FormData
): Promise<InstallationActionState> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };
    const { orgId } = session.user;

    const id = String(formData.get("installationId") ?? "");
    if (!id) return { success: false, error: "Select an installation first." };

    const parseAmount = (name: string, label: string) => {
      const raw = String(formData.get(name) ?? "").replace(/[,\s]/g, "");
      if (raw === "") return 0;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) return null;
      return n;
    };

    const amount = parseAmount("amount", "Amount");
    const simPayment = parseAmount("simPayment", "Sim");
    const devicePayment = parseAmount("devicePayment", "Device");
    if (amount === null || simPayment === null || devicePayment === null) {
      return { success: false, error: "Enter valid, non-negative amounts." };
    }

    const installation = await prisma.installation.findFirst({
      where: { id, orgId, deletedAt: null },
      select: { id: true },
    });
    if (!installation) return { success: false, error: "That installation was not found." };

    await prisma.installation.update({
      where: { id: installation.id },
      data: { installationPay: amount, simPayment, devicePayment },
    });

    revalidatePath("/sales-report");
    revalidatePath("/installations");
    return { success: true };
  } catch (error) {
    console.error("[actions/installations/sale-amounts]", error);
    return { success: false, error: "Failed to update the sale. Please try again." };
  }
}

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
      where: { id, orgId, deletedAt: null },
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

    // Money is always moving here (amount > 0 was already checked above), so
    // a method is required as soon as the org has any to choose from — same
    // rule as the entry forms' resolvePayingAccount, just always in the "in" branch
    const accountId = String(formData.get("accountId") ?? "") || null;
    const account = await resolvePayingAccount(orgId, accountId, amount, "in");
    if (!account.ok) return { success: false, error: account.error };

    const nowPaid = Math.round((alreadyPaid + amount) * 100) / 100;

    await prisma.$transaction([
      prisma.installation.update({
        where: { id: installation.id },
        data: { amountPaid: nowPaid, received: nowPaid >= payable },
      }),
      prisma.installationPayment.create({
        data: { orgId, installationId: installation.id, accountId: account.accountId, amount },
      }),
    ]);

    revalidatePath("/installations");
    revalidatePath("/customers");
    revalidatePath("/payment-methods");
    return { success: true };
  } catch (error) {
    console.error("[actions/installations/pay]", error);
    return { success: false, error: "Failed to record the payment. Please try again." };
  }
}
