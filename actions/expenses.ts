"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveInstallationAccount } from "@/lib/accounts";
import { addExpenseSchema } from "@/lib/validations/expense";

export type ExpenseActionState = { success: boolean; error?: string } | null;

export async function addExpense(
  _prevState: ExpenseActionState,
  formData: FormData
): Promise<ExpenseActionState> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };
    const { orgId, id: userId } = session.user;

    const parsed = addExpenseSchema.safeParse({
      description: formData.get("description"),
      amount: formData.get("amount"),
      accountId: formData.get("accountId") || null,
      spentAt: formData.get("spentAt"),
    });
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const d = parsed.data;
    const amount = parseFloat(d.amount);
    if (!(amount > 0)) return { success: false, error: "Amount must be greater than 0." };

    // Same required-when-available / hidden-when-none rule used for installations —
    // every expense moves real money, so a payment method is picked whenever one exists.
    const accountResolution = await resolveInstallationAccount(orgId, d.accountId || null);
    if (!accountResolution.ok) return { success: false, error: accountResolution.error };

    await prisma.expense.create({
      data: {
        orgId,
        category: "misc",
        description: d.description,
        amount: d.amount,
        accountId: accountResolution.accountId,
        spentAt: new Date(d.spentAt),
        createdBy: userId,
      },
    });

    revalidatePath("/expenses");
    revalidatePath("/payment-methods");
    return { success: true };
  } catch (error) {
    console.error("[actions/expenses/add]", error);
    return { success: false, error: "Failed to add expense. Please try again." };
  }
}

export async function deleteExpense(
  _prevState: ExpenseActionState,
  formData: FormData
): Promise<ExpenseActionState> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };
    const { orgId } = session.user;

    const id = formData.get("id") as string;
    if (!id) return { success: false, error: "ID is required" };

    await prisma.expense.delete({ where: { id, orgId } });

    revalidatePath("/expenses");
    revalidatePath("/payment-methods");
    return { success: true };
  } catch (error) {
    console.error("[actions/expenses/delete]", error);
    return { success: false, error: "Failed to delete expense." };
  }
}
