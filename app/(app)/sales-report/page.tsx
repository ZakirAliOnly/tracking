import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { SalesReportView, type SalesRow } from "@/components/sales/SalesReportView";
import { pageWindow, parsePage } from "@/lib/pagination";
import type { Prisma } from "@prisma/client";

/** A date input posts `YYYY-MM-DD`; anything else is ignored rather than trusted. */
function parseDateParam(value: string | undefined): string | null {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

type Props = {
  searchParams: Promise<{ from?: string; to?: string; page?: string }>;
};

export default async function SalesReportPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  const { orgId } = session.user;
  const sp = await searchParams;

  const page = parsePage(sp.page);
  const from = parseDateParam(sp.from);
  const to = parseDateParam(sp.to);
  // Reading a backwards range in the order given beats showing an empty table
  const range = from && to && from > to ? { from: to, to: from } : { from, to };

  // Dated by when the work was done, which is what makes this a sales figure
  // rather than a snapshot of the book
  const where: Prisma.InstallationWhereInput = {
    orgId,
    deletedAt: null,
    ...(range.from || range.to
      ? {
          installationDate: {
            ...(range.from ? { gte: new Date(`${range.from}T00:00:00.000Z`) } : {}),
            ...(range.to ? { lte: new Date(`${range.to}T00:00:00.000Z`) } : {}),
          },
        }
      : {}),
  };

  const [raw, total, totals] = await Promise.all([
    prisma.installation.findMany({
      where,
      select: {
        id: true,
        installationDate: true,
        installationPay: true,
        simPayment: true,
        devicePayment: true,
        customer: { select: { name: true } },
        vehicle: { select: { registrationNo: true } },
      },
      orderBy: { installationDate: "desc" },
      ...pageWindow(page),
    }),
    prisma.installation.count({ where }),
    // Totals span the whole range, not just the page being read — a KPI that
    // only counted 25 rows would be wrong the moment the list paginated
    prisma.installation.aggregate({
      where,
      _sum: { installationPay: true, simPayment: true, devicePayment: true },
    }),
  ]);

  const rows: SalesRow[] = raw.map((i) => ({
    id: i.id,
    customerName: i.customer.name,
    registrationNo: i.vehicle.registrationNo,
    installationDate: i.installationDate.toISOString(),
    amount: i.installationPay.toString(),
    simPayment: i.simPayment.toString(),
    devicePayment: i.devicePayment.toString(),
    // What is left of the installation charge once SIM and device are taken out
    totalSale: String(Number(i.installationPay) - Number(i.simPayment) - Number(i.devicePayment)),
  }));

  const sumAmount = Number(totals._sum.installationPay ?? 0);
  const sumSim = Number(totals._sum.simPayment ?? 0);
  const sumDevice = Number(totals._sum.devicePayment ?? 0);
  const sumTotal = sumAmount - sumSim - sumDevice;

  return (
    <div className="p-6">
      <PageHeader
        title="Sales Report"
        subtitle="Amount, Sim and Device per installation, with the total sale"
      />
      <div className="mt-5">
        <SalesReportView
          rows={rows}
          page={page}
          total={total}
          totalAmount={sumAmount}
          totalSim={sumSim}
          totalDevice={sumDevice}
          totalSale={sumTotal}
          from={range.from ?? ""}
          to={range.to ?? ""}
          searchParams={sp}
        />
      </div>
    </div>
  );
}
