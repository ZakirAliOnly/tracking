import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  InstallationsView,
  type InstallationRow,
  type StockDeviceOption,
} from "@/components/installations/InstallationsView";
import { RENEWAL_REMINDER_DAYS } from "@/lib/utils";

export default async function InstallationsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { orgId } = session.user;

  const today = new Date();
  const soonCutoff = new Date();
  soonCutoff.setDate(today.getDate() + RENEWAL_REMINDER_DAYS);

  const [raw, customers, accounts, stockDevices] = await Promise.all([
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
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.customer.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.account.findMany({
      where: { orgId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.device.findMany({
      where: { orgId, status: "in_stock", quantity: { gt: 0 } },
      select: { id: true, fmModule: true, imeiNo: true, gsmNo: true, salePrice: true, quantity: true },
      orderBy: { fmModule: "asc" },
    }),
  ]);

  const installations: InstallationRow[] = raw.map((i) => {
    const vehicleDescription =
      [i.vehicle.make, i.vehicle.model].filter(Boolean).join(" ") ||
      i.vehicle.registrationNo;

    return {
      id: i.id,
      customerName: i.customer.name,
      vehicleDescription,
      registrationNo: i.vehicle.registrationNo,
      imeiNo: i.device.imeiNo,
      gsmNo: i.device.gsmNo,
      gsmNoAlt: i.device.gsmNoAlt,
      fmModule: i.device.fmModule,
      cutOff: i.device.cutOff,
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

  const deviceOptions: StockDeviceOption[] = stockDevices.map((d) => ({
    id: d.id,
    label: d.fmModule ?? "Unknown device",
    imeiNo: d.imeiNo,
    gsmNo: d.gsmNo,
    salePrice: d.salePrice?.toString() ?? null,
    quantity: d.quantity,
  }));

  return (
    <div className="p-6">
      <PageHeader
        title="Installations"
        subtitle="Every device fitted, with payment breakdown"
      />
      <div className="mt-6">
        <InstallationsView
          installations={installations}
          customers={customers}
          accounts={accounts}
          deviceOptions={deviceOptions}
        />
      </div>
    </div>
  );
}
