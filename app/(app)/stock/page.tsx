import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { StockView, type DeviceRow, type StockStats } from "@/components/stock/StockView";
import type { SupplierOption } from "@/components/stock/AddDeviceModal";
import { pageWindow, parsePage } from "@/lib/pagination";
import type { Prisma } from "@prisma/client";

type Props = {
  searchParams: Promise<{ page?: string }>;
};

export default async function StockPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  const { orgId } = session.user;
  const sp = await searchParams;

  const page = parsePage(sp.page);

  // Stock is what is actually on the shelf. A device leaves this list when it
  // is fitted (status moves to `installed` by stock movement, never by hand)
  const where: Prisma.DeviceWhereInput = { orgId, status: "in_stock" };

  const [devices, total, typeTotals, suppliers] = await Promise.all([
    prisma.device.findMany({
      where,
      include: { supplier: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      ...pageWindow(page),
    }),
    prisma.device.count({ where }),
    // Broken down by pool, across the whole org — not just this page
    prisma.device.groupBy({ by: ["type"], where, _sum: { quantity: true } }),
    prisma.supplier.findMany({
      where: { orgId, status: "active" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const byType = Object.fromEntries(typeTotals.map((t) => [t.type, t._sum.quantity ?? 0]));

  const stats: StockStats = {
    deviceUnits: byType["device"] ?? 0,
    simUnits: byType["sim"] ?? 0,
    lines: total,
  };

  const rows: DeviceRow[] = devices.map((d) => ({
    id: d.id,
    fmModule: d.fmModule,
    type: d.type === "sim" ? "sim" : "device",
    supplierName: d.supplier?.name ?? null,
    quantity: Number(d.quantity) || 0,
    costPrice: d.costPrice?.toString() ?? null,
    salePrice: d.salePrice?.toString() ?? null,
  }));

  const supplierOptions: SupplierOption[] = suppliers.map((s) => ({
    id: s.id,
    name: s.name,
  }));

  return (
    <div className="p-6">
      <PageHeader title="Stock" subtitle="Devices on hand" />
      <div className="mt-5">
        <StockView
          devices={rows}
          stats={stats}
          suppliers={supplierOptions}
          page={page}
          total={total}
          searchParams={sp}
        />
      </div>
    </div>
  );
}
