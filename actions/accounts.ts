"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addAccountSchema, editAccountSchema, transferFundsSchema } from "@/lib/validations/account";

export type AccountActionState = { success: boolean; error?: string } | null;

export async function addAccount(
  _prevState: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };
    const { orgId } = session.user;

    const parsed = addAccountSchema.safeParse({
      name: formData.get("name"),
      type: formData.get("type") || "cash",
      openingBalance: formData.get("openingBalance") || undefined,
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const d = parsed.data;
    const openingBalance = d.openingBalance ? parseFloat(d.openingBalance) : 0;

    await prisma.$executeRaw`
      INSERT INTO accounts (id, org_id, name, type, opening_balance, is_active, created_at)
      VALUES (${randomUUID()}, ${orgId}, ${d.name}, ${d.type}, ${openingBalance}, true, NOW())
    `;

    revalidatePath("/payment-methods");
    return { success: true };
  } catch (error) {
    console.error("[accounts/add]", error);
    return { success: false, error: "Failed to add account." };
  }
}

export async function editAccount(
  _prevState: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };
    const { orgId } = session.user;

    const parsed = editAccountSchema.safeParse({
      id: formData.get("id"),
      name: formData.get("name"),
      type: formData.get("type") || "cash",
      openingBalance: formData.get("openingBalance") || undefined,
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const d = parsed.data;
    const openingBalance = d.openingBalance ? parseFloat(d.openingBalance) : 0;

    await prisma.$executeRaw`
      UPDATE accounts
      SET name = ${d.name}, type = ${d.type}, opening_balance = ${openingBalance}
      WHERE id = ${d.id} AND org_id = ${orgId}
    `;

    revalidatePath("/payment-methods");
    return { success: true };
  } catch (error) {
    console.error("[accounts/edit]", error);
    return { success: false, error: "Failed to update account." };
  }
}

export async function deleteAccount(
  _prevState: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };
    const { orgId } = session.user;

    const id = formData.get("id") as string;
    if (!id) return { success: false, error: "ID is required" };

    await prisma.account.delete({ where: { id, orgId } });

    revalidatePath("/payment-methods");
    return { success: true };
  } catch (error) {
    console.error("[accounts/delete]", error);
    return { success: false, error: "Cannot delete — account may have linked transactions." };
  }
}

export async function transferFunds(
  _prevState: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };
    const { orgId } = session.user;

    const parsed = transferFundsSchema.safeParse({
      fromId: formData.get("fromId"),
      toId: formData.get("toId"),
      amount: formData.get("amount"),
      transferredAt: formData.get("transferredAt"),
      note: formData.get("note") || undefined,
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const d = parsed.data;
    if (d.fromId === d.toId) return { success: false, error: "Source and destination cannot be the same." };

    const amount = parseFloat(d.amount);
    if (amount <= 0) return { success: false, error: "Amount must be greater than 0." };

    await prisma.$executeRaw`
      INSERT INTO fund_transfers (id, org_id, from_id, to_id, amount, note, transferred_at, created_at)
      VALUES (
        ${randomUUID()},
        ${orgId},
        ${d.fromId},
        ${d.toId},
        ${amount},
        ${d.note ?? null},
        ${d.transferredAt}::date,
        NOW()
      )
    `;

    revalidatePath("/payment-methods");
    return { success: true };
  } catch (error) {
    console.error("[accounts/transfer]", error);
    return { success: false, error: "Failed to transfer funds." };
  }
}
