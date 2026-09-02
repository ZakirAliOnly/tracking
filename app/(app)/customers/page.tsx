import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { CustomersView, type CustomerRow } from "@/components/customers/CustomersView";
import { listActiveAccounts } from "@/lib/accounts";
import { listInstallableDevices } from "@/lib/devices";
import { RENEWAL_REMINDER_DAYS } from "@/lib/utils";

export default async function CustomersPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const { orgId } = session.user;

  const today = new Date();
  const soonCutoff = new Date();
  soonCutoff.setDate(today.getDate() + RENEWAL_REMINDER_DAYS);

  const [raw, accounts, devices] = await Promise.all([
    prisma.customer.findMany({
      where: { orgId },
      include: {
        contacts: { select: { id: true } },
        vehicles: { select: { id: true } },
        installations: {
          where: { status: "active", deletedAt: null },
          select: { id: true, nextRenewalDate: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    listActiveAccounts(orgId),
    listInstallableDevices(orgId),
  ]);

  const customers: CustomerRow[] = raw.map((c) => {
    const activeInstallCount = c.installations.length;
    const hasDueRenewal = c.installations.some(
      (i) => i.nextRenewalDate <= soonCutoff
    );

    let status: CustomerRow["status"];
    if (activeInstallCount === 0) status = "inactive";
    else if (hasDueRenewal) status = "renewal_due";
    else status = "active";

    return {
      id: c.id,
      name: c.name,
      phone: c.phone,
      address: c.address,
      remarks: c.remarks,
      contactCount: c.contacts.length,
      vehicleCount: c.vehicles.length,
      activeInstallCount,
      status,
    };
  });

  return (
    <div className="p-6">
      <PageHeader
        title="Customers"
        subtitle="Clients, contacts and their vehicles"
      />
      <div className="mt-6">
        <CustomersView customers={customers} accounts={accounts} devices={devices} />
      </div>
    </div>
  );
}
