import type { Prisma } from "@prisma/client";
import type { DeviceLine } from "@/lib/devices";
import { RENEWAL_MONTHS } from "@/lib/utils";
import { addMonths, toDateOnly } from "@/lib/csv-import";
import { normalizeRegistration } from "@/lib/import-plan";

/**
 * One installation as the team enters it: who, which vehicle, when, and the
 * money. Both the New installation form and the CSV import normalise into this
 * shape so the mapping lives in exactly one place.
 */
export type InstallationRecord = {
  customerId: string | null;
  customerName: string;
  registrationNo: string;
  installationDate: string;
  received: boolean;
  amount: number;
  simPayment: number;
  simNo: string | null;
  /**
   * Already verified to belong to this org. Absent means the caller has no
   * opinion — the CSV import — so a re-imported row keeps the payment method
   * somebody picked by hand. `null` means deliberately none.
   */
  accountId?: string | null;
  /** Rupees off, already resolved from a percentage if that is how it was entered. */
  discount?: number;
  amountPaid?: number;
  /**
   * Every device fitted, already checked for org and availability. Supplying
   * the list takes those units out of stock and returns anything previously
   * fitted. Absent means the caller has no opinion (CSV import) and stock is
   * left alone.
   */
  devices?: DeviceLine[];
};

export type WriteOutcome = "created" | "updated";

/**
 * Squares stock with what is actually fitted. Everything previously on this
 * installation goes back first and the new list comes out, so re-saving the
 * same devices is a no-op, swapping one returns the old unit, and removing a
 * line puts its units back.
 */
async function moveStock(
  tx: Prisma.TransactionClient,
  orgId: string,
  previous: DeviceLine[],
  next: DeviceLine[]
): Promise<void> {
  const delta = new Map<string, number>();

  for (const line of previous) {
    delta.set(line.deviceId, (delta.get(line.deviceId) ?? 0) + line.quantity);
  }
  for (const line of next) {
    delta.set(line.deviceId, (delta.get(line.deviceId) ?? 0) - line.quantity);
  }

  for (const [deviceId, change] of delta) {
    if (change === 0) continue;
    await tx.device.updateMany({
      where: { id: deviceId, orgId },
      data: { quantity: { increment: change } },
    });
  }
}

export async function writeInstallation(
  tx: Prisma.TransactionClient,
  orgId: string,
  record: InstallationRecord
): Promise<WriteOutcome> {
  const customerId =
    record.customerId ??
    (
      await tx.customer.create({
        data: { orgId, name: record.customerName, phone: "" },
      })
    ).id;

  // Matched case-insensitively so "bhn-058" does not become a second vehicle
  // alongside "BHN-058"; only brand-new plates get the normalised form
  const registrationNo = normalizeRegistration(record.registrationNo);

  const existingVehicle = await tx.vehicle.findFirst({
    where: { orgId, registrationNo: { equals: registrationNo, mode: "insensitive" } },
    select: { id: true },
  });

  const vehicle = existingVehicle
    ? await tx.vehicle.update({ where: { id: existingVehicle.id }, data: { customerId } })
    : await tx.vehicle.create({ data: { orgId, customerId, registrationNo } });

  const installationDate = toDateOnly(record.installationDate);

  const installationData = {
    installationDate,
    received: record.received,
    // total_amount is generated from the four payment columns; only these two
    // are collected now, so the rest stay at zero
    installationPay: record.amount,
    simPayment: record.simPayment,
    simNo: record.simNo,
  };

  // Kept out of installationData so a key is absent entirely when the caller has
  // no opinion — an import must not clear a payment method, discount or part
  // payment that was entered by hand on the form
  const optionalFields = {
    ...(record.accountId === undefined ? {} : { accountId: record.accountId }),
    ...(record.discount === undefined ? {} : { discount: record.discount }),
    ...(record.amountPaid === undefined ? {} : { amountPaid: record.amountPaid }),
    // The single column still holds the first device so older read paths work
    ...(record.devices === undefined ? {} : { deviceId: record.devices[0]?.deviceId ?? null }),
  };

  // One vehicle carries one installation, so re-entering it updates in place
  const existing = await tx.installation.findFirst({
    where: { orgId, vehicleId: vehicle.id },
    select: { id: true, devices: { select: { deviceId: true, quantity: true, unitPrice: true } } },
  });

  const installationId = existing
    ? (
        await tx.installation.update({
          where: { id: existing.id },
          data: { customerId, ...installationData, ...optionalFields },
          select: { id: true },
        })
      ).id
    : (
        await tx.installation.create({
          data: {
            orgId,
            customerId,
            vehicleId: vehicle.id,
            status: "active",
            nextRenewalDate: toDateOnly(addMonths(record.installationDate, RENEWAL_MONTHS)),
            ...installationData,
            ...optionalFields,
          },
          select: { id: true },
        })
      ).id;

  if (record.devices !== undefined) {
    const previous: DeviceLine[] = (existing?.devices ?? []).map((d) => ({
      deviceId: d.deviceId,
      quantity: d.quantity,
      unitPrice: Number(d.unitPrice),
    }));

    await moveStock(tx, orgId, previous, record.devices);

    // The list is replaced wholesale rather than diffed — stock is already
    // squared above, so the rows only need to end up matching what was entered
    await tx.installationDevice.deleteMany({ where: { installationId } });

    if (record.devices.length > 0) {
      await tx.installationDevice.createMany({
        data: record.devices.map((d) => ({
          installationId,
          deviceId: d.deviceId,
          quantity: d.quantity,
          unitPrice: d.unitPrice,
        })),
      });
    }
  }

  return existing ? "updated" : "created";
}
