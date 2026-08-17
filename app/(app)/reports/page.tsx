import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReportsView } from "@/components/reports/ReportsView";

export default async function ReportsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const { orgId } = session.user;

  const accounts = await prisma.account.findMany({
    where: { orgId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6">
      <PageHeader
        title="Reports"
        subtitle="Pick a report, set filters, then generate — clean export-friendly tables"
      />
      <div className="mt-6">
        <ReportsView accounts={accounts} />
      </div>
    </div>
  );
}
