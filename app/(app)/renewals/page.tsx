import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { RenewalsView, type RenewalRow, type RenewalStatus } from "@/components/renewals/RenewalsView";
import { RENEWAL_REMINDER_DAYS } from "@/lib/utils";
import type { AccountOption } from "@/components/renewals/RecordRenewalModal";

export default async function RenewalsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const { orgId } = session.user;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const soonCutoff = new Date(today);
  soonCutoff.setDate(today.getDate() + RENEWAL_REMINDER_DAYS);

  const [installations, accounts] = await Promise.all([
    prisma.installation.findMany({
      where: { orgId, status: "active" },
      include: {
        customer: { select: { name: true } },
        vehicle: { select: { registrationNo: true } },
        account: { select: { name: true } },
        renewals: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { nextRenewalDate: "asc" },
    }),
    prisma.account.findMany({
      where: { orgId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows: RenewalRow[] = installations.map((inst) => {
    const lastRenewal = inst.renewals[0] ?? null;
    const dueDate = inst.nextRenewalDate;
    const diffMs = dueDate.getTime() - today.getTime();
    const daysUntilDue = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // "received" = the last renewal record is received=true and its nextRenewalDate
    // is the same as the installation's current nextRenewalDate (= just recorded)
    const isReceived =
      lastRenewal !== null &&
      lastRenewal.received &&
      lastRenewal.nextRenewalDate.getTime() === dueDate.getTime();

    let status: RenewalStatus;
    if (isReceived) status = "received";
    else if (daysUntilDue < 0) status = "overdue";
    else if (daysUntilDue <= RENEWAL_REMINDER_DAYS) status = "due_soon";
    else status = "upcoming";

    // Display amounts from last renewal record if it exists
    const amount = lastRenewal?.amount?.toString() ?? null;
    const simOsting = lastRenewal?.simOsting?.toString() ?? null;
    const net = lastRenewal?.net?.toString() ?? null;
    const other = lastRenewal?.other?.toString() ?? null;

    // Pre-fill for the form: use last renewal amounts if available, else installation amounts
    const prefillAmount =
      lastRenewal?.amount?.toString() ?? inst.installationPay.toString();
    const prefillSimOsting =
      lastRenewal?.simOsting?.toString() ?? inst.simPayment.toString();
    const prefillNet =
      lastRenewal?.net?.toString() ?? inst.netPayment.toString();

    return {
      installationId: inst.id,
      customerName: inst.customer.name,
      registrationNo: inst.vehicle.registrationNo,
      dueDateIso: dueDate.toISOString(),
      accountName: inst.account?.name ?? null,
      accountId: inst.accountId,
      status,
      daysUntilDue,
      amount,
      simOsting,
      net,
      other,
      prefillAmount,
      prefillSimOsting,
      prefillNet,
      nextRenewalDateIso: dueDate.toISOString(),
    };
  });

  const accountOptions: AccountOption[] = accounts.map((a) => ({
    id: a.id,
    name: a.name,
  }));

  const dueSoonCount = rows.filter(
    (r) => r.status === "due_soon" || r.status === "overdue"
  ).length;

  return (
    <div className="p-6">
      <PageHeader
        title="Renewals"
        subtitle="Yearly tracking subscription renewals"
      />
      {dueSoonCount > 0 && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-[10px] bg-warning-light px-4 py-2.5">
          <span className="text-[13px] font-semibold text-warning-foreground">
            {dueSoonCount} renewal{dueSoonCount > 1 ? "s" : ""} need attention
          </span>
        </div>
      )}
      <div className="mt-5">
        <RenewalsView rows={rows} accounts={accountOptions} />
      </div>
    </div>
  );
}
