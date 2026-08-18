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
/** The sheet's Contact 1–4 pairs. Position is the sheet's own column order. */
export type ContactLine = { name: string; mobile: string; position: number };

/** Everything the CSV knows about the vehicle beyond its plate. */
export type VehicleDetail = {
  description: string | null;
  make: string | null;
  model: string | null;
  engineNo: string | null;
  chassisNo: string | null;
  colour: string | null;
};

/** Everything the CSV knows about the customer beyond their name. */
export type CustomerDetail = {
  phone: string | null;
  address: string | null;
  remarks: string | null;
  password: string | null;
};

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
   * The groups below follow the same rule as `accountId` — absent means the
   * caller has no opinion and whatever is stored is left alone, so the New
   * installation form never has to send fields it does not collect.
   */
  customerDetail?: CustomerDetail;
  contacts?: ContactLine[];
  vehicleDetail?: VehicleDetail;
  devicePayment?: number;
  otherAmount?: number;
  /**
   * Plain reference text kept on the installation itself — not linked to a
   * Stock device or its quantity. Used by the New installation form, which
   * fits devices from real stock separately; these are just notes about the
   * unit that was actually fitted.
   */
  gsmNo?: string;
  fmModule?: string;
  cutOff?: string;
  imeiNo?: string;
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

/** Blank cells carry no instruction, so they are dropped rather than written as null. */
function omitNull<T extends Record<string, string | null>>(
  source: T
): { [K in keyof T]?: NonNullable<T[K]> } {
  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== null)
  ) as { [K in keyof T]?: NonNullable<T[K]> };
}

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
  // Only the keys the caller actually supplied, so a blank cell never wipes a
  // detail somebody filled in by hand
  const customerDetail = record.customerDetail
    ? omitNull({
        phone: record.customerDetail.phone,
        address: record.customerDetail.address,
        remarks: record.customerDetail.remarks,
        password: record.customerDetail.password,
      })
    : {};

  const customerId =
    record.customerId ??
    (
      await tx.customer.create({
        data: { orgId, name: record.customerName, phone: "", ...customerDetail },
      })
    ).id;

  if (record.customerId !== null && Object.keys(customerDetail).length > 0) {
    await tx.customer.update({ where: { id: customerId }, data: customerDetail });
  }

  if (record.contacts !== undefined) {
    // Written by position so a row carrying only Contact 1 leaves exactly one
    for (const contact of record.contacts) {
      const existing = await tx.contact.findFirst({
        where: { customerId, position: contact.position },
        select: { id: true },
      });

      if (existing) {
        await tx.contact.update({
          where: { id: existing.id },
          data: { name: contact.name, mobile: contact.mobile },
        });
      } else {
        await tx.contact.create({
          data: { customerId, name: contact.name, mobile: contact.mobile, position: contact.position },
        });
      }
    }

    const kept = record.contacts.map((c) => c.position);
    await tx.contact.deleteMany({ where: { customerId, position: { notIn: kept } } });
  }

  // Matched case-insensitively so "bhn-058" does not become a second vehicle
  // alongside "BHN-058"; only brand-new plates get the normalised form
  const registrationNo = normalizeRegistration(record.registrationNo);

  const existingVehicle = await tx.vehicle.findFirst({
    where: { orgId, registrationNo: { equals: registrationNo, mode: "insensitive" } },
    select: { id: true },
  });

  const vehicleDetail = record.vehicleDetail ? omitNull(record.vehicleDetail) : {};

  const vehicle = existingVehicle
    ? await tx.vehicle.update({
        where: { id: existingVehicle.id },
        data: { customerId, ...vehicleDetail },
      })
    : await tx.vehicle.create({ data: { orgId, customerId, registrationNo, ...vehicleDetail } });

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
    ...(record.devicePayment === undefined ? {} : { devicePayment: record.devicePayment }),
    ...(record.otherAmount === undefined ? {} : { otherAmount: record.otherAmount }),
    ...(record.gsmNo === undefined ? {} : { gsmNo: record.gsmNo }),
    ...(record.fmModule === undefined ? {} : { fmModule: record.fmModule }),
    ...(record.cutOff === undefined ? {} : { cutOff: record.cutOff }),
    ...(record.imeiNo === undefined ? {} : { imeiNo: record.imeiNo }),
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
