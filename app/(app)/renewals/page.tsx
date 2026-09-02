import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { RenewalsView } from "@/components/renewals/RenewalsView";
import type { AccountOption } from "@/components/renewals/RecordRenewalModal";
import { fetchRenewalRows, type RenewalFilter } from "@/lib/renewals-query";
import { parsePage } from "@/lib/pagination";

/** A date input posts `YYYY-MM-DD`; anything else is ignored rather than trusted. */
function parseDateParam(value: string | undefined): string | null {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

type Props = {
  searchParams: Promise<{ status?: string; page?: string; from?: string; to?: string }>;
};

export default async function RenewalsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  const { orgId } = session.user;
  const sp = await searchParams;

  const filter: RenewalFilter =
    sp.status === "received" || sp.status === "all" ? sp.status : "pending";
  const page = parsePage(sp.page);

  const from = parseDateParam(sp.from);
  const to = parseDateParam(sp.to);
  // A backwards range would silently return nothing; reading it in the order
  // given is friendlier than showing an empty table
  const range =
    from && to && from > to ? { from: to, to: from } : { from, to };

  const [{ rows, total, dueSoonCount }, rawAccounts, simStockLine] = await Promise.all([
    fetchRenewalRows(orgId, filter, range, page),
    prisma.account.findMany({
      where: { orgId, isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    // The one bulk Sim pool — its sale price is what SIM & Osting defaults to,
    // rather than the last renewal's own figure, per Stock's current price
    prisma.device.findFirst({
      where: { orgId, type: "sim", imeiNo: null },
      select: { salePrice: true },
    }),
  ]);

  const accountOptions: AccountOption[] = rawAccounts.map((a) => ({
    id: a.id,
    name: a.name,
  }));

  const simSalePrice = simStockLine?.salePrice?.toString() ?? "0";

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
        <RenewalsView
          rows={rows}
          accounts={accountOptions}
          simSalePrice={simSalePrice}
          filter={filter}
          page={page}
          total={total}
          dueSoonCount={dueSoonCount}
          from={range.from ?? ""}
          to={range.to ?? ""}
          searchParams={sp}
        />
      </div>
    </div>
  );
}
