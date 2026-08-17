"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveInstallationAccount } from "@/lib/accounts";
import { resolveInstallationDevices, type DeviceLine } from "@/lib/devices";
import { normalizeRegistration } from "@/lib/import-plan";
import { resolvePayment } from "@/lib/installation-money";
import { writeInstallation } from "@/lib/installation-write";
import { customerSchema } from "@/lib/validations/customer";
import {
  customerInstallationSchema,
  toDeviceLines,
  type CustomerInstallationInput,
} from "@/lib/validations/import";

export type SaveCustomerState = { success: boolean; error?: string } | null;

type ResolvedInstallation = {
  data: CustomerInstallationInput;
  accountId: string | null;
  devices: DeviceLine[];
};

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

    // Installations only ride along with a brand-new customer; an existing
    // one gets its installations from the Installations page
    const wantsInstallation = !id && formData.get("withInstallation") === "on";

    let rawInstallations: unknown[] = [];
    if (wantsInstallation) {
      const raw = formData.get("installationsJson");
      try {
        const decoded = raw ? JSON.parse(String(raw)) : [];
        if (!Array.isArray(decoded)) throw new Error("not an array");
        rawInstallations = decoded;
      } catch {
        return { success: false, error: "Could not read the installation details. Please try again." };
      }
    }

    const parsedInstallations: CustomerInstallationInput[] = [];
    for (const [i, item] of rawInstallations.entries()) {
      const result = customerInstallationSchema.safeParse(item);
      if (!result.success) {
        return {
          success: false,
          error: `Installation ${i + 1}: ${result.error.issues[0].message}`,
        };
      }
      parsedInstallations.push(result.data);
    }

    // Two blocks aimed at the same vehicle would otherwise silently collapse
    // into one installation inside writeInstallation
    const seenRegistrations = new Map<string, number>();
    for (const [i, inst] of parsedInstallations.entries()) {
      const key = normalizeRegistration(inst.registrationNo);
      const firstSeenAt = seenRegistrations.get(key);
      if (firstSeenAt !== undefined) {
        return {
          success: false,
          error: `Registration No ${inst.registrationNo} is used in both Installation ${firstSeenAt + 1} and Installation ${i + 1} — combine them into one.`,
        };
      }
      seenRegistrations.set(key, i);
    }

    const resolvedInstallations: ResolvedInstallation[] = [];
    const reservedDevices = new Map<string, number>();

    for (const inst of parsedInstallations) {
      const account = await resolveInstallationAccount(orgId, inst.accountId);
      if (!account.ok) return { success: false, error: account.error };

      const lines = toDeviceLines(inst.deviceIds, inst.deviceQuantities);
      const devices = await resolveInstallationDevices(orgId, lines, reservedDevices);
      if (!devices.ok) return { success: false, error: devices.error };

      for (const line of devices.lines) {
        reservedDevices.set(line.deviceId, (reservedDevices.get(line.deviceId) ?? 0) + line.quantity);
      }

      resolvedInstallations.push({ data: inst, accountId: account.accountId, devices: devices.lines });
    }

    const data = {
      name: parsed.data.name,
      phone: parsed.data.phone,
      address: parsed.data.address ?? null,
      remarks: parsed.data.remarks ?? null,
    };

    if (id) {
      await prisma.customer.update({ where: { id, orgId }, data });
    } else if (resolvedInstallations.length > 0) {
      await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.create({ data: { orgId, ...data } });

        for (const resolved of resolvedInstallations) {
          const payment = resolvePayment(resolved.data);

          await writeInstallation(tx, orgId, {
            customerId: customer.id,
            customerName: customer.name,
            ...resolved.data,
            // After the spread so only verified / resolved figures can be written
            accountId: resolved.accountId,
            devices: resolved.devices,
            received: payment.received,
            discount: payment.discount,
            amountPaid: payment.amountPaid,
          });
        }
      });
    } else {
      await prisma.customer.create({ data: { orgId, ...data } });
    }

    revalidatePath("/customers");

    if (resolvedInstallations.length > 0) {
      revalidatePath("/installations");
      revalidatePath("/renewals");
      revalidatePath("/payment-methods");
      revalidatePath("/stock");
    }

    return { success: true };
  } catch (error) {
    console.error("[actions/customers]", error);
    return { success: false, error: "Failed to save customer. Please try again." };
  }
}
