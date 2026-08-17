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

export default async function InstallationsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { orgId } = session.user;

  const today = new Date();
  const soonCutoff = new Date();
  soonCutoff.setDate(today.getDate() + RENEWAL_REMINDER_DAYS);

  const [raw, customers, accounts, devices] = await Promise.all([
    prisma.installation.findMany({
      where: { orgId },
      include: {
        customer: { select: { name: true } },
        vehicle: {
          select: {
            registrationNo: true,
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
        account: { select: { name: true } },
        devices: {
          select: {
            quantity: true,
            unitPrice: true,
            device: { select: { fmModule: true, imeiNo: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
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
      vehicleDescription,
      registrationNo: i.vehicle.registrationNo,
      simNo: i.simNo,
      received: i.received,
      amount: i.installationPay.toString(),
      simPayment: i.simPayment.toString(),
      discount: i.discount.toString(),
      amountPaid: i.amountPaid.toString(),
      fittedDevices: i.devices.map((d) => ({
        name: d.device.fmModule ?? d.device.imeiNo ?? "Device",
        quantity: d.quantity,
        unitPrice: d.unitPrice.toString(),
      })),
      // Only rows created before the form was simplified carry a device
      imeiNo: i.device?.imeiNo ?? null,
      gsmNo: i.device?.gsmNo ?? null,
      gsmNoAlt: i.device?.gsmNoAlt ?? null,
      fmModule: i.device?.fmModule ?? null,
      cutOff: i.device?.cutOff ?? null,
      engineNo: i.vehicle.engineNo,
      chassisNo: i.vehicle.chassisNo,
      colour: i.vehicle.colour,
      installationDate: i.installationDate.toISOString(),
      totalAmount: i.totalAmount?.toString() ?? null,
      accountName: i.account?.name ?? null,
      nextRenewalDate: i.nextRenewalDate.toISOString(),
      status: i.status,
      isRenewalDue: i.status === "active" && i.nextRenewalDate <= soonCutoff,
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
        />
      </div>
    </div>
  );
}
