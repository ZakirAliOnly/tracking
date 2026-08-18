import type { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import type { InstallableDevice } from "@/lib/device-options";

// The type and its display helpers live in `lib/device-options.ts` so the entry
// forms can use them without pulling Prisma into the browser bundle

/**
 * Stock lines that can be fitted. Out-of-stock lines are listed too, marked as
 * such by the form, so staff can see a device exists but has run out rather
 * than wondering why it is missing.
 */
export async function listInstallableDevices(orgId: string): Promise<InstallableDevice[]> {
  const devices = await prisma.device.findMany({
    where: { orgId, status: "in_stock" },
    select: { id: true, fmModule: true, imeiNo: true, salePrice: true, quantity: true },
    orderBy: { fmModule: "asc" },
  });

  return devices.map((d) => ({
    id: d.id,
    name: d.fmModule ?? d.imeiNo ?? "Device",
    salePrice: d.salePrice?.toString() ?? null,
    quantity: d.quantity,
  }));
}

/** The device identity columns a CSV row carries. */
export type ImportedDeviceDetail = {
  imeiNo: string;
  fmModule: string | null;
  gsmNo: string | null;
  gsmNoAlt: string | null;
  cutOff: string | null;
  salePrice: number;
};

/**
 * The device on an imported row. An IMEI is one physical unit, so it is matched
 * on that alone — a plate re-imported later reuses the same stock row instead of
 * making a second one. A unit nobody has recorded yet is created already fitted,
 * which is what a historical sheet describes: it was installed long ago and was
 * never in stock here.
 *
 * Kept apart from `resolveInstallationDevices`, which serves the entry form and
 * refuses stock lines that have no sale price or have run out — neither rule can
 * apply to a sheet describing work already done.
 */
export async function resolveImportedDevice(
  tx: Prisma.TransactionClient,
  orgId: string,
  detail: ImportedDeviceDetail
): Promise<DeviceLine> {
  const identity = omitNull({
    fmModule: detail.fmModule,
    gsmNo: detail.gsmNo,
    gsmNoAlt: detail.gsmNoAlt,
    cutOff: detail.cutOff,
  });

  const existing = await tx.device.findFirst({
    where: { orgId, imeiNo: detail.imeiNo },
    select: { id: true, salePrice: true },
  });

  if (existing) {
    await tx.device.update({ where: { id: existing.id }, data: identity });
    return {
      deviceId: existing.id,
      quantity: 1,
      // The stock row's own price wins — the sheet's figure is what was charged
      // on the day, not what the unit is worth now
      unitPrice: Number(existing.salePrice ?? detail.salePrice),
    };
  }

  const created = await tx.device.create({
    data: {
      id: randomUUID(),
      orgId,
      imeiNo: detail.imeiNo,
      salePrice: detail.salePrice,
      // Created with the unit already accounted for; `moveStock` takes it out
      quantity: 1,
      status: "in_stock",
      ...identity,
    },
    select: { id: true },
  });

  return { deviceId: created.id, quantity: 1, unitPrice: detail.salePrice };
}

function omitNull<T extends Record<string, string | null>>(
  source: T
): { [K in keyof T]?: NonNullable<T[K]> } {
  return Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== null)
  ) as { [K in keyof T]?: NonNullable<T[K]> };
}

/** One device line as the form posts it. */
export type DeviceLineInput = { deviceId: string; quantity: number };

/** The same line once priced and checked against stock. */
export type DeviceLine = { deviceId: string; quantity: number; unitPrice: number };

export type DeviceResolution =
  | { ok: true; lines: DeviceLine[]; subtotal: number }
  | { ok: false; error: string };

/**
 * Decides which devices an installation may be fitted with and what they are
 * worth. Fitting at least one is required as soon as the org holds any stock
 * line, so a brand-new org is not blocked. Prices are read from the stock rows
 * here and never taken from the browser.
 *
 * `reserved` lets several installations in one submission (the Add customer
 * form's multiple-installation blocks) share the same stock check — each
 * device's quantity already claimed by an earlier block in the batch is
 * subtracted before this one is checked, so two blocks cannot both fit units
 * that only exist once.
 */
export async function resolveInstallationDevices(
  orgId: string,
  input: DeviceLineInput[],
  reserved: Map<string, number> = new Map()
): Promise<DeviceResolution> {
  // The same device can be added twice; stock is checked against the total
  const wanted = new Map<string, number>();
  for (const line of input) {
    if (line.quantity < 1) return { ok: false, error: "Every device needs a quantity of 1 or more." };
    wanted.set(line.deviceId, (wanted.get(line.deviceId) ?? 0) + line.quantity);
  }

  if (wanted.size === 0) {
    const held = await prisma.device.count({ where: { orgId, status: "in_stock" } });
    if (held > 0) return { ok: false, error: "Add at least one device to this installation." };
    return { ok: true, lines: [], subtotal: 0 };
  }

  const devices = await prisma.device.findMany({
    where: { id: { in: [...wanted.keys()] }, orgId, status: "in_stock" },
    select: { id: true, salePrice: true, quantity: true, fmModule: true },
  });

  const byId = new Map(devices.map((d) => [d.id, d]));

  for (const [deviceId, needed] of wanted) {
    const device = byId.get(deviceId);
    if (!device) return { ok: false, error: "One of those devices is not in stock. Pick another." };

    const name = device.fmModule ?? "that device";
    const available = device.quantity - (reserved.get(deviceId) ?? 0);

    if (available < needed) {
      return {
        ok: false,
        error:
          available < 1
            ? `No stock available for ${name}. Record a purchase invoice first.`
            : `Only ${available} of ${name} left in stock — ${needed} were added.`,
      };
    }

    if (device.salePrice === null) {
      return { ok: false, error: `${name} has no sale price set. Add one on the Stock page.` };
    }
  }

  const lines: DeviceLine[] = input.map((line) => ({
    deviceId: line.deviceId,
    quantity: line.quantity,
    unitPrice: Number(byId.get(line.deviceId)!.salePrice),
  }));

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  return { ok: true, lines, subtotal: Math.round(subtotal * 100) / 100 };
}
