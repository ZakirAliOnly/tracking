import { prisma } from "@/lib/prisma";

export type AccountOption = { id: string; name: string };

export async function listActiveAccounts(orgId: string): Promise<AccountOption[]> {
  return prisma.account.findMany({
    where: { orgId, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export type AccountResolution =
  | { ok: true; accountId: string | null }
  | { ok: false; error: string };

/**
 * Decides what payment method an installation may be written with. Picking one
 * is required as soon as the org has any to choose from, so a brand-new org can
 * still record installations before setting any up. The id is re-checked
 * against the org here — it arrives from the browser and is never trusted.
 */
export async function resolveInstallationAccount(
  orgId: string,
  accountId: string | null
): Promise<AccountResolution> {
  if (accountId !== null) {
    const account = await prisma.account.findFirst({
      where: { id: accountId, orgId, isActive: true },
      select: { id: true },
    });

    if (!account) {
      return { ok: false, error: "That payment method is not available. Pick another." };
    }

    return { ok: true, accountId };
  }

  const available = await prisma.account.count({ where: { orgId, isActive: true } });

  if (available > 0) {
    return { ok: false, error: "Choose which payment method the money went to." };
  }

  return { ok: true, accountId: null };
}

/**
 * Sibling of resolveInstallationAccount for records that only move money when
 * something is actually paid up front (purchase invoices' "amount paid now").
 * No amount paid means no account is needed. Any amount paid requires one —
 * unless the org has none set up yet, which must not block the invoice.
 */
export async function resolvePayingAccount(
  orgId: string,
  accountId: string | null,
  amountPaid: number
): Promise<AccountResolution> {
  if (amountPaid <= 0) {
    return { ok: true, accountId: null };
  }

  const available = await prisma.account.count({ where: { orgId, isActive: true } });
  if (available === 0) {
    return { ok: true, accountId: null };
  }

  if (!accountId) {
    return { ok: false, error: "Choose which payment method the money came from." };
  }

  const account = await prisma.account.findFirst({
    where: { id: accountId, orgId, isActive: true },
    select: { id: true },
  });

  if (!account) {
    return { ok: false, error: "That payment method is not available. Pick another." };
  }

  return { ok: true, accountId };
}
