import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  InstallationsView,
  type InstallationRow,
} from "@/components/installations/InstallationsView";
import { listActiveAccounts } from "@/lib/accounts";
import { listInstallableDevices } from "@/lib/devices";
import { RENEWAL_REMINDER_DAYS } from "@/lib/utils";
import { pageWindow, parsePage } from "@/lib/pagination";
import type { Prisma } from "@prisma/client";

type Filter = "all" | "active" | "suspended" | "trash";

function whereForFilter(orgId: string, filter: Filter): Prisma.InstallationWhereInput {
  // Trash is the one filter that deliberately looks past deletedAt — every
  // other tab and every search on this page excludes trashed installations
  if (filter === "trash") return { orgId, deletedAt: { not: null } };
  if (filter === "active") return { orgId, status: { not: "suspended" }, deletedAt: null };
  if (filter === "suspended") return { orgId, status: "suspended", deletedAt: null };
  return { orgId, deletedAt: null };
}

/**
 * Registration number or IMEI, matched as a partial, case-insensitive
 * substring so a half-remembered plate still finds the row.
 *
 * An IMEI can reach an installation three ways and all three have to be
 * searched or a row would be missable depending on how it was entered:
 * `installations.imei_no` is the plain reference text the New installation
 * form writes, `device` is the legacy single-device link older rows carry,
 * and `devices` is the fitted-device lines the CSV import creates.
 */
function whereForQuery(query: string): Prisma.InstallationWhereInput {
  const contains = { contains: query, mode: "insensitive" } as const;
  return {
    OR: [
      { vehicle: { registrationNo: contains } },
      { imeiNo: contains },
      { device: { imeiNo: contains } },
      { devices: { some: { device: { imeiNo: contains } } } },
    ],
  };
}

/**
 * One line per real number. A blank mobile can't be deduped on, so those are
 * kept as-is — a named contact with no number is still worth showing.
 */
function dedupeContacts(
  contacts: { name: string; mobile: string }[]
): { name: string; mobile: string }[] {
  const seen = new Set<string>();
  return contacts.filter((c) => {
    const key = c.mobile.replace(/\D/g, "");
    if (key === "") return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

type Props = {
  searchParams: Promise<{ status?: string; page?: string; q?: string }>;
};

export default async function InstallationsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");

  const { orgId } = session.user;
  const sp = await searchParams;

  const filter: Filter =
    sp.status === "active" || sp.status === "suspended" || sp.status === "trash"
      ? sp.status
      : "all";
  const page = parsePage(sp.page);
  const query = (sp.q ?? "").trim();

  const where: Prisma.InstallationWhereInput = query
    ? { AND: [whereForFilter(orgId, filter), whereForQuery(query)] }
    : whereForFilter(orgId, filter);

  const today = new Date();
  const soonCutoff = new Date();
  soonCutoff.setDate(today.getDate() + RENEWAL_REMINDER_DAYS);

  const [raw, total, customers, accounts, devices] = await Promise.all([
    prisma.installation.findMany({
      where,
      include: {
        customer: {
          select: {
            name: true,
            phone: true,
            address: true,
            remarks: true,
            // Feeds the search lookup card's Contact Information panel
            contacts: {
              select: { name: true, mobile: true, position: true },
              orderBy: { position: "asc" },
            },
          },
        },
        vehicle: {
          select: {
            registrationNo: true,
            description: true,
            make: true,
            model: true,
            engineNo: true,
            chassisNo: true,
            colour: true,
          },
        },
        device: {
          select: {
            imeiNo: true,
            gsmNo: true,
            gsmNoAlt: true,
            fmModule: true,
            cutOff: true,
          },
        },
        account: { select: { id: true, name: true } },
        devices: {
          select: {
            deviceId: true,
            quantity: true,
            unitPrice: true,
            device: { select: { fmModule: true, imeiNo: true, type: true } },
          },
        },
        imeiChanges: {
          select: { oldImei: true, newImei: true, changedAt: true },
          orderBy: { changedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      ...pageWindow(page),
    }),
    prisma.installation.count({ where }),
    // Option lists for the New Installation modal's pickers — the complete
    // set, not paginated, since they back search-as-you-type over everything
    prisma.customer.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    listActiveAccounts(orgId),
    listInstallableDevices(orgId),
  ]);

  const installations: InstallationRow[] = raw.map((i) => {
    const vehicleDescription =
      [i.vehicle.make, i.vehicle.model].filter(Boolean).join(" ") || i.vehicle.registrationNo;

    return {
      id: i.id,
      customerName: i.customer.name,
      remarks: i.customer.remarks,
      // The customer's own phone leads, then their named contacts — the lookup
      // card lists them together the way the old sheet did. The import writes
      // Contact 1's mobile to both places, so the same number is dropped rather
      // than listed twice
      contacts: dedupeContacts([
        ...(i.customer.phone ? [{ name: i.customer.name, mobile: i.customer.phone }] : []),
        ...i.customer.contacts.map((c) => ({ name: c.name, mobile: c.mobile })),
      ]),
      vehicleDescription,
      registrationNo: i.vehicle.registrationNo,
      simNo: i.simNo,
      received: i.received,
      amount: i.installationPay.toString(),
      simPayment: i.simPayment.toString(),
      discount: i.discount.toString(),
      amountPaid: i.amountPaid.toString(),
      fittedDevices: i.devices.map((d) => ({
        deviceId: d.deviceId,
        name: d.device.fmModule ?? d.device.imeiNo ?? "Device",
        quantity: d.quantity,
        unitPrice: d.unitPrice.toString(),
        type: d.device.type === "sim" ? ("sim" as const) : ("device" as const),
      })),
      // The installation's own reference text wins where it has any — that is
      // what the New installation form writes. `device` is the legacy single
      // -device link only older rows carry, so it stays as the fallback
      imeiNo: i.imeiNo ?? i.device?.imeiNo ?? null,
      gsmNo: i.gsmNo ?? i.device?.gsmNo ?? null,
      gsmNoAlt: i.device?.gsmNoAlt ?? null,
      fmModule: i.fmModule ?? i.device?.fmModule ?? null,
      cutOff: i.cutOff ?? i.device?.cutOff ?? null,
      engineNo: i.vehicle.engineNo,
      chassisNo: i.vehicle.chassisNo,
      colour: i.vehicle.colour,
      installationDate: i.installationDate.toISOString(),
      totalAmount: i.totalAmount?.toString() ?? null,
      accountId: i.account?.id ?? null,
      accountName: i.account?.name ?? null,
      nextRenewalDate: i.nextRenewalDate.toISOString(),
      status: i.status,
      isRenewalDue: i.status === "active" && i.nextRenewalDate <= soonCutoff,
      deletedAt: i.deletedAt?.toISOString() ?? null,
      imeiHistory: i.imeiChanges.map((c) => ({
        oldImei: c.oldImei,
        newImei: c.newImei,
        changedAt: c.changedAt.toISOString(),
      })),
      // Edit-only fields — not shown in the read-only detail card, only used
      // to pre-fill the New installation form when it is reused for editing
      edit: {
        phone: i.customer.phone,
        address: i.customer.address,
        carDescription: i.vehicle.description,
        make: i.vehicle.make,
        model: i.vehicle.model,
        contacts: i.customer.contacts.map((c) => ({
          name: c.name,
          mobile: c.mobile,
          position: c.position,
        })),
      },
    };
  });

  return (
    <div className="p-6">
      <PageHeader title="Installations" subtitle="Every vehicle fitted, with its payment" />
      <div className="mt-6">
        <InstallationsView
          installations={installations}
          customers={customers}
          accounts={accounts}
          devices={devices}
          filter={filter}
          page={page}
          total={total}
          query={query}
          searchParams={sp}
        />
      </div>
    </div>
  );
}
