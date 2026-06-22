import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { fetchDashboardData } from "@/actions/dashboard";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const data = await fetchDashboardData("month");
  if (!data) redirect("/login");

  return <DashboardClient initialData={data} />;
}
