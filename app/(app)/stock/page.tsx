import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  StockView,
  type DeviceRow,
  type DeviceStatus,
  type StockStats,
} from "@/components/stock/StockView";
import type { SupplierOption } from "@/components/stock/AddDeviceModal";
import { pageWindow, parsePage } from "@/lib/pagination";
import type { Prisma } from "@prisma/client";

type Filter = "all" | "in_stock" | "faulty" | "returned";
const STOCK_STATUSES = ["in_stock", "faulty", "returned"] as const;

type Props = {
  searchParams: Promise<{ status?: string; page?: string }>;
};

export default async function StockPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  const { orgId } = session.user;
  const sp = await searchParams;

  const filter: Filter =
    sp.status === "in_stock" || sp.status === "faulty" || sp.status === "returned"
      ? sp.status
      : "all";
  const page = parsePage(sp.page);

  const where: Prisma.DeviceWhereInput = {
    orgId,
    status: filter === "all" ? { in: [...STOCK_STATUSES] } : filter,
  };

  const [devices, total, statusTotals, suppliers] = await Promise.all([
    prisma.device.findMany({
      where,
      include: { supplier: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      ...pageWindow(page),
    }),
    prisma.device.count({ where }),
    // Org-wide totals regardless of which tab/page is active — a groupBy
    // instead of loading every device row into JS to sum
    prisma.device.groupBy({
      by: ["status"],
      where: { orgId, status: { in: [...STOCK_STATUSES] } },
      _sum: { quantity: true },
    }),
    prisma.supplier.findMany({
      where: { orgId, status: "active" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const totalsByStatus = Object.fromEntries(
    statusTotals.map((s) => [s.status, s._sum.quantity ?? 0])
  );

  const stats: StockStats = {
    inStock: totalsByStatus["in_stock"] ?? 0,
    faulty: totalsByStatus["faulty"] ?? 0,
    returned: totalsByStatus["returned"] ?? 0,
  };

  const rows: DeviceRow[] = devices.map((d) => ({
    id: d.id,
    fmModule: d.fmModule,
    supplierName: d.supplier?.name ?? null,
    quantity: Number(d.quantity) || 0,
    costPrice: d.costPrice?.toString() ?? null,
    salePrice: d.salePrice?.toString() ?? null,
    status: d.status as DeviceStatus,
  }));

  const supplierOptions: SupplierOption[] = suppliers.map((s) => ({
    id: s.id,
    name: s.name,
  }));

  return (
    <div className="p-6">
      <PageHeader title="Stock" subtitle="Device and SIM inventory" />
      <div className="mt-5">
        <StockView
          devices={rows}
          stats={stats}
          suppliers={supplierOptions}
          filter={filter}
          page={page}
          total={total}
          searchParams={sp}
        />
      </div>
    </div>
  );
}
