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
import type { SupplierOption } from "@/components/stock/AddDeviceDrawer";

export default async function StockPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const { orgId } = session.user;

  const [devices, suppliers] = await Promise.all([
    prisma.device.findMany({
      where: {
        orgId,
        // Only show stock-managed devices (exclude installed — those belong to installation records)
        status: { in: ["in_stock", "faulty", "returned"] },
      },
      include: {
        supplier: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.supplier.findMany({
      where: { orgId, status: "active" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const qty = (d: (typeof devices)[0]) => Number(d.quantity) || 0;

  const stats: StockStats = {
    inStock: devices.filter((d) => d.status === "in_stock").reduce((s, d) => s + qty(d), 0),
    faulty: devices.filter((d) => d.status === "faulty").reduce((s, d) => s + qty(d), 0),
    returned: devices.filter((d) => d.status === "returned").reduce((s, d) => s + qty(d), 0),
  };

  const rows: DeviceRow[] = devices.map((d) => ({
    id: d.id,
    fmModule: d.fmModule,
    supplierName: d.supplier?.name ?? null,
    quantity: qty(d),
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
        <StockView devices={rows} stats={stats} suppliers={supplierOptions} />
      </div>
    </div>
  );
}
