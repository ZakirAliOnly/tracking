import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AutoPrint } from "./AutoPrint";

type Props = { params: Promise<{ id: string }> };

export default async function PrintInvoicePage({ params }: Props) {
  const session = await auth();
  if (!session) redirect("/login");
  const { orgId } = session.user;

  const { id } = await params;

  const inv = await prisma.purchaseInvoice.findUnique({
    where: { id },
    include: {
      supplier: { select: { name: true, phone: true, address: true, contactName: true } },
      device: { select: { fmModule: true } },
      organization: { select: { name: true } },
    },
  });

  if (!inv || inv.orgId !== orgId) notFound();

  const total = Number(inv.totalAmount);
  const paid = Number(inv.amountPaid);
  const remaining = total - paid;

  function fmtRs(v: number) {
    if (!v) return "Rs 0";
    return `Rs ${Math.round(v).toLocaleString("en-PK")}`;
  }

  function fmtDate(d: Date) {
    return d.toLocaleDateString("en-PK", { day: "2-digit", month: "long", year: "numeric" });
  }

  return (
    <>
      {/* React 19 hoists <style> to <head> automatically */}
      <style>{`
        body { background: #fff !important; }
        .inv-page { max-width: 720px; margin: 0 auto; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: #111827; }
        .inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #e5e7eb; }
        .inv-org { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; color: #111827; }
        .inv-org-sub { font-size: 13px; color: #6b7280; margin-top: 4px; }
        .inv-label h2 { font-size: 28px; font-weight: 800; color: #e11d48; letter-spacing: -1px; text-align: right; }
        .inv-label p { font-size: 12px; color: #6b7280; text-align: right; margin-top: 4px; }
        .inv-parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
        .inv-party h3 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 8px; }
        .inv-party-name { font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 2px; }
        .inv-party-detail { font-size: 13px; color: #6b7280; margin-bottom: 1px; }
        .inv-table { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
        .inv-table thead tr { border-bottom: 2px solid #e5e7eb; }
        .inv-table th { text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7280; padding: 8px 12px 8px 0; }
        .inv-table th.right, .inv-table td.right { text-align: right; }
        .inv-table tbody tr { border-bottom: 1px solid #f3f4f6; }
        .inv-table td { padding: 12px 12px 12px 0; font-size: 14px; color: #374151; }
        .inv-table td.bold { font-weight: 700; color: #111827; }
        .inv-table td.note { font-size: 12px; color: #9ca3af; }
        .inv-summary { margin-left: auto; width: 280px; margin-bottom: 40px; }
        .inv-sum-row { display: flex; justify-content: space-between; padding: 7px 0; font-size: 14px; color: #374151; }
        .inv-sum-row.big { font-size: 16px; font-weight: 800; color: #111827; }
        .inv-sum-row.paid .val { color: #15803d; font-weight: 600; }
        .inv-sum-row.due { border-top: 2px solid #e5e7eb; margin-top: 6px; padding-top: 10px; }
        .inv-sum-row.due .val { color: #dc2626; font-weight: 800; font-size: 18px; }
        .inv-sum-row.settled .val { color: #15803d; font-weight: 700; }
        .inv-footer { border-top: 1px solid #e5e7eb; padding-top: 20px; display: flex; justify-content: space-between; color: #9ca3af; font-size: 12px; }
        .inv-print-btn { position: fixed; top: 16px; right: 16px; background: #e11d48; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 14px rgba(225,29,72,0.35); display: flex; align-items: center; gap: 8px; }
        .inv-print-btn:hover { opacity: 0.9; }
        @media print {
          .inv-print-btn { display: none !important; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .inv-page { padding: 0; }
        }
      `}</style>

      <AutoPrint />

      <button
        className="inv-print-btn"
        onClick={undefined}
        id="__inv_print_btn"
      >
        🖨&nbsp;Print Invoice
      </button>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.getElementById('__inv_print_btn').addEventListener('click',()=>window.print())`,
        }}
      />

      <div className="inv-page">
        {/* Header */}
        <div className="inv-header">
          <div>
            <p className="inv-org">{inv.organization.name}</p>
            <p className="inv-org-sub">Purchase Invoice</p>
          </div>
          <div className="inv-label">
            <h2>INVOICE</h2>
            <p>Date: {fmtDate(inv.invoiceDate)}</p>
            <p>Ref: #{inv.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>

        {/* Parties */}
        <div className="inv-parties">
          <div className="inv-party">
            <h3>Supplier</h3>
            <p className="inv-party-name">{inv.supplier.name}</p>
            {inv.supplier.contactName && (
              <p className="inv-party-detail">{inv.supplier.contactName}</p>
            )}
            {inv.supplier.phone && (
              <p className="inv-party-detail">{inv.supplier.phone}</p>
            )}
            {inv.supplier.address && (
              <p className="inv-party-detail">{inv.supplier.address}</p>
            )}
          </div>
          <div className="inv-party" style={{ textAlign: "right" }}>
            <h3>Billed to</h3>
            <p className="inv-party-name">{inv.organization.name}</p>
          </div>
        </div>

        {/* Line items */}
        <table className="inv-table">
          <thead>
            <tr>
              <th>Item / Device</th>
              <th className="right">Qty</th>
              <th className="right">Unit cost</th>
              <th className="right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="bold">{inv.device.fmModule ?? "Device"}</td>
              <td className="right">{inv.quantity}</td>
              <td className="right">{fmtRs(Number(inv.costPrice))}</td>
              <td className="right bold">{fmtRs(total)}</td>
            </tr>
            {inv.notes && (
              <tr>
                <td colSpan={4} className="note">
                  Note: {inv.notes}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Summary */}
        <div className="inv-summary">
          <div className="inv-sum-row big">
            <span>Total</span>
            <span className="val">{fmtRs(total)}</span>
          </div>
          <div className="inv-sum-row paid">
            <span>Paid upfront</span>
            <span className="val">{fmtRs(paid)}</span>
          </div>
          <div className={`inv-sum-row due ${remaining <= 0 ? "settled" : ""}`}>
            <span>{remaining > 0 ? "Balance due" : "Status"}</span>
            <span className="val">{remaining > 0 ? fmtRs(remaining) : "Fully paid ✓"}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="inv-footer">
          <span>Generated by {inv.organization.name}</span>
          <span>
            {new Date().toLocaleDateString("en-PK", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </span>
        </div>
      </div>
    </>
  );
}
