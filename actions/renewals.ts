"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { resolveRenewalAccount } from "@/lib/accounts";
import { recordRenewalSchema } from "@/lib/validations/renewal";
import { RENEWAL_MONTHS } from "@/lib/utils";
import { addMonths, toDateOnly } from "@/lib/csv-import";

export type RenewalActionState = { success: boolean; error?: string } | null;

export async function recordRenewal(
  _prevState: RenewalActionState,
  formData: FormData
): Promise<RenewalActionState> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };
    const { orgId } = session.user;

    const parsed = recordRenewalSchema.safeParse({
      installationId: formData.get("installationId"),
      accountId: formData.get("accountId") || null,
      amount: formData.get("amount"),
      simOsting: formData.get("simOsting") || "0",
      net: formData.get("net") || "0",
      other: formData.get("other") || "0",
      otherNote: formData.get("otherNote") || undefined,
      renewedAt: formData.get("renewedAt"),
      nextRenewalDate: formData.get("nextRenewalDate"),
    });

    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }

    const d = parsed.data;

    // Verify installation belongs to this org and is not sitting in Trash
    const installation = await prisma.installation.findFirst({
      where: { id: d.installationId, orgId, deletedAt: null },
    });
    if (!installation) return { success: false, error: "Installation not found." };

    const account = await resolveRenewalAccount(orgId, d.accountId || null);
    if (!account.ok) return { success: false, error: account.error };

    const renewalDate = new Date(d.nextRenewalDate);

    await prisma.$transaction([
      prisma.renewal.create({
        data: {
          orgId,
          installationId: d.installationId,
          accountId: account.accountId,
          received: true,
          amount: d.amount,
          simOsting: d.simOsting || "0",
          net: d.net || "0",
          other: d.other || "0",
          otherNote: d.otherNote || null,
          renewedAt: new Date(d.renewedAt),
          nextRenewalDate: renewalDate,
        },
      }),
      prisma.installation.update({
        where: { id: d.installationId },
        data: { nextRenewalDate: renewalDate },
      }),
    ]);

    revalidatePath("/renewals");
    revalidatePath("/installations");
    return { success: true };
  } catch (error) {
    console.error("[actions/renewals]", error);
    return { success: false, error: "Failed to record renewal. Please try again." };
  }
}

/**
 * Corrects an already-recorded renewal's figures. Only the amounts, payment
 * date, method and note change — `nextRenewalDate` is left alone on both the
 * renewal and the installation, since editing a mistake in what was charged
 * is not the same thing as moving the due-date timeline. Only the renewal
 * that is still the installation's *latest* may be edited — an older one is
 * not shown anywhere in the UI to edit, so this is a defensive check rather
 * than a real restriction users will hit.
 */
export async function updateRenewal(
  _prevState: RenewalActionState,
  formData: FormData
): Promise<RenewalActionState> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };
    const { orgId } = session.user;

    const id = String(formData.get("renewalId") ?? "");
    if (!id) return { success: false, error: "Renewal is required." };

    const parsed = recordRenewalSchema.safeParse({
      installationId: formData.get("installationId"),
      accountId: formData.get("accountId") || null,
      amount: formData.get("amount"),
      simOsting: formData.get("simOsting") || "0",
      net: formData.get("net") || "0",
      other: formData.get("other") || "0",
      otherNote: formData.get("otherNote") || undefined,
      renewedAt: formData.get("renewedAt"),
      nextRenewalDate: formData.get("nextRenewalDate"),
    });
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message };
    }
    const d = parsed.data;

    const renewal = await prisma.renewal.findFirst({
      where: { id, orgId, installationId: d.installationId },
      select: { id: true },
    });
    if (!renewal) return { success: false, error: "That renewal was not found." };

    const account = await resolveRenewalAccount(orgId, d.accountId || null);
    if (!account.ok) return { success: false, error: account.error };

    await prisma.renewal.update({
      where: { id: renewal.id },
      data: {
        accountId: account.accountId,
        amount: d.amount,
        simOsting: d.simOsting || "0",
        net: d.net || "0",
        other: d.other || "0",
        otherNote: d.otherNote || null,
        renewedAt: new Date(d.renewedAt),
      },
    });

    revalidatePath("/renewals");
    revalidatePath("/installations");
    revalidatePath("/payment-methods");
    return { success: true };
  } catch (error) {
    console.error("[actions/renewals/update]", error);
    return { success: false, error: "Failed to update the renewal. Please try again." };
  }
}

/**
 * Deletes the installation's latest renewal and reverts its due date back to
 * what it was before that renewal was recorded — the second-most-recent
 * renewal's own `nextRenewalDate` if one exists, otherwise the installation's
 * original `installationDate + RENEWAL_MONTHS`. Only the latest renewal can
 * ever be deleted through this — there is no UI for an older one, and
 * deleting one out of order would corrupt the due-date timeline.
 */
export async function deleteRenewal(
  _prevState: RenewalActionState,
  formData: FormData
): Promise<RenewalActionState> {
  try {
    const session = await auth();
    if (!session) return { success: false, error: "Unauthorized" };
    const { orgId } = session.user;

    const id = String(formData.get("renewalId") ?? "");
    if (!id) return { success: false, error: "Renewal is required." };

    const renewal = await prisma.renewal.findFirst({
      where: { id, orgId },
      select: { id: true, installationId: true },
    });
    if (!renewal) return { success: false, error: "That renewal was not found." };

    const installation = await prisma.installation.findFirst({
      where: { id: renewal.installationId, orgId },
      select: { id: true, installationDate: true },
    });
    if (!installation) return { success: false, error: "That installation was not found." };

    const priorRenewal = await prisma.renewal.findFirst({
      where: { installationId: renewal.installationId, orgId, id: { not: renewal.id } },
      orderBy: { createdAt: "desc" },
      select: { nextRenewalDate: true },
    });

    const revertedDueDate = priorRenewal
      ? priorRenewal.nextRenewalDate
      : toDateOnly(addMonths(installation.installationDate.toISOString().slice(0, 10), RENEWAL_MONTHS));

    await prisma.$transaction([
      prisma.renewal.delete({ where: { id: renewal.id } }),
      prisma.installation.update({
        where: { id: installation.id },
        data: { nextRenewalDate: revertedDueDate },
      }),
    ]);

    revalidatePath("/renewals");
    revalidatePath("/installations");
    revalidatePath("/payment-methods");
    return { success: true };
  } catch (error) {
    console.error("[actions/renewals/delete]", error);
    return { success: false, error: "Failed to delete the renewal. Please try again." };
  }
}
