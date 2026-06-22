import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReportsView } from "@/components/reports/ReportsView";

export default async function ReportsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="p-6">
      <PageHeader
        title="Reports"
        subtitle="Pick a report, set filters, then generate — clean export-friendly tables"
      />
      <div className="mt-6">
        <ReportsView />
      </div>
    </div>
  );
}
