"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recordRenewalSchema } from "@/lib/validations/renewal";

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

    // Verify installation belongs to this org
    const installation = await prisma.installation.findFirst({
      where: { id: d.installationId, orgId },
    });
    if (!installation) return { success: false, error: "Installation not found." };

    const renewalDate = new Date(d.nextRenewalDate);

    await prisma.$transaction([
      prisma.renewal.create({
        data: {
          orgId,
          installationId: d.installationId,
          accountId: d.accountId || null,
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
