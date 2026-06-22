"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  addSupplierSchema,
  editSupplierSchema,
  purchaseInvoiceSchema,
  supplierPaymentSchema,
} from "@/lib/validations/supplier";

export type SupplierActionState = { success: boolean; error?: string } | null;

export async function addSupplier(
  _prevState: SupplierActionState,
  formData: FormData
): Promise<SupplierActionState> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };
    const { orgId } = session.user;

    const parsed = addSupplierSchema.safeParse({
      name: formData.get("name"),
      phone: formData.get("phone") || undefined,
      contactName: formData.get("contactName") || undefined,
      address: formData.get("address") || undefined,
      openingOwed: formData.get("openingOwed") || undefined,
      supplies: formData.get("supplies") || undefined,
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const d = parsed.data;
    const openingOwed = d.openingOwed ? parseFloat(d.openingOwed) : 0;

    await prisma.$executeRaw`
      INSERT INTO suppliers (id, org_id, name, contact_name, phone, address, opening_owed, supplies, status, created_at)
      VALUES (
        ${randomUUID()},
        ${orgId},
        ${d.name},
        ${d.contactName ?? null},
        ${d.phone ?? null},
        ${d.address ?? null},
        ${openingOwed},
        ${d.supplies ?? null},
        'active',
        NOW()
      )
    `;

    revalidatePath("/suppliers");
    return { success: true };
  } catch (error) {
    console.error("[suppliers/add]", error);
    return { success: false, error: "Failed to add supplier." };
  }
}

export async function editSupplier(
  _prevState: SupplierActionState,
  formData: FormData
): Promise<SupplierActionState> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };
    const { orgId } = session.user;

    const parsed = editSupplierSchema.safeParse({
      id: formData.get("id"),
      name: formData.get("name"),
      phone: formData.get("phone") || undefined,
      contactName: formData.get("contactName") || undefined,
      address: formData.get("address") || undefined,
      openingOwed: formData.get("openingOwed") || undefined,
      supplies: formData.get("supplies") || undefined,
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const d = parsed.data;
    const openingOwed = d.openingOwed ? parseFloat(d.openingOwed) : 0;

    await prisma.$executeRaw`
      UPDATE suppliers
      SET
        name = ${d.name},
        contact_name = ${d.contactName ?? null},
        phone = ${d.phone ?? null},
        address = ${d.address ?? null},
        opening_owed = ${openingOwed},
        supplies = ${d.supplies ?? null}
      WHERE id = ${d.id}
        AND org_id = ${orgId}
    `;

    revalidatePath("/suppliers");
    return { success: true };
  } catch (error) {
    console.error("[suppliers/edit]", error);
    return { success: false, error: "Failed to update supplier." };
  }
}

export async function deleteSupplier(
  _prevState: SupplierActionState,
  formData: FormData
): Promise<SupplierActionState> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };
    const { orgId } = session.user;

    const id = formData.get("id") as string;
    if (!id) return { success: false, error: "ID is required" };

    await prisma.supplier.delete({ where: { id, orgId } });

    revalidatePath("/suppliers");
    return { success: true };
  } catch (error) {
    console.error("[suppliers/delete]", error);
    return { success: false, error: "Cannot delete supplier — they may have linked records." };
  }
}

export async function createPurchaseInvoice(
  _prevState: SupplierActionState,
  formData: FormData
): Promise<SupplierActionState> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };
    const { orgId } = session.user;

    const parsed = purchaseInvoiceSchema.safeParse({
      supplierId: formData.get("supplierId"),
      deviceId: formData.get("deviceId"),
      quantity: formData.get("quantity"),
      costPrice: formData.get("costPrice"),
      salePrice: formData.get("salePrice") || undefined,
      amountPaid: formData.get("amountPaid") || undefined,
      invoiceDate: formData.get("invoiceDate"),
      notes: formData.get("notes") || undefined,
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const d = parsed.data;
    const quantity = parseInt(d.quantity, 10);
    const costPrice = parseFloat(d.costPrice);
    const salePrice = d.salePrice ? parseFloat(d.salePrice) : null;
    const amountPaid = d.amountPaid ? parseFloat(d.amountPaid) : 0;
    const totalAmount = quantity * costPrice;
    const id = randomUUID();

    await prisma.$transaction([
      prisma.$executeRaw`
        INSERT INTO purchase_invoices (id, org_id, supplier_id, device_id, quantity, cost_price, sale_price, total_amount, amount_paid, notes, invoice_date, created_at)
        VALUES (
          ${id},
          ${orgId},
          ${d.supplierId},
          ${d.deviceId},
          ${quantity},
          ${costPrice},
          ${salePrice},
          ${totalAmount},
          ${amountPaid},
          ${d.notes ?? null},
          ${d.invoiceDate}::date,
          NOW()
        )
      `,
      prisma.$executeRaw`
        UPDATE devices
        SET
          quantity = quantity + ${quantity},
          cost_price = ${costPrice},
          sale_price = COALESCE(${salePrice}, sale_price)
        WHERE id = ${d.deviceId}
          AND org_id = ${orgId}
      `,
    ]);

    revalidatePath("/suppliers");
    revalidatePath("/stock");
    return { success: true };
  } catch (error) {
    console.error("[suppliers/purchase-invoice]", error);
    return { success: false, error: "Failed to create purchase invoice." };
  }
}

export async function recordSupplierPayment(
  _prevState: SupplierActionState,
  formData: FormData
): Promise<SupplierActionState> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };
    const { orgId } = session.user;

    const parsed = supplierPaymentSchema.safeParse({
      supplierId: formData.get("supplierId"),
      amount: formData.get("amount"),
      accountId: formData.get("accountId") || null,
      paidAt: formData.get("paidAt"),
      note: formData.get("note") || undefined,
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const d = parsed.data;
    const amount = parseFloat(d.amount);
    const accountId = d.accountId || null;

    await prisma.$executeRaw`
      INSERT INTO supplier_payments (id, org_id, supplier_id, account_id, amount, note, paid_at, created_at)
      VALUES (
        ${randomUUID()},
        ${orgId},
        ${d.supplierId},
        ${accountId},
        ${amount},
        ${d.note ?? null},
        ${d.paidAt}::date,
        NOW()
      )
    `;

    revalidatePath("/suppliers");
    return { success: true };
  } catch (error) {
    console.error("[suppliers/payment]", error);
    return { success: false, error: "Failed to record payment." };
  }
}
