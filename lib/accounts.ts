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
 * Finds the org's Cash account, creating it if this is the first time it's
 * needed. Shared by anything that wants to default to Cash rather than force
 * a pick — the CSV import (no payment-method column in the sheet) and
 * renewals (an unselected Payment Method should quietly mean Cash).
 */
export async function resolveOrCreateCashAccountId(orgId: string): Promise<string> {
  const existing = await prisma.account.findFirst({
    where: { orgId, name: { equals: "Cash", mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.account.create({
    data: { orgId, name: "Cash", type: "cash" },
    select: { id: true },
  });
  return created.id;
}

/**
 * Resolves a renewal's payment method. Unlike `resolveInstallationAccount`,
 * leaving it unpicked is never an error — it quietly defaults to Cash
 * (created on first use) rather than blocking the renewal.
 */
export async function resolveRenewalAccount(
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

  return { ok: true, accountId: await resolveOrCreateCashAccountId(orgId) };
}

/**
 * Sibling of resolveInstallationAccount for records that only move money when
 * something is actually paid (purchase invoices' "amount paid now",
 * installations' "amount paid"). No amount paid means no account is needed —
 * and any account the browser sent is dropped, since nothing moved for it to
 * describe. Any amount paid requires one, unless the org has none set up yet,
 * which must not block the record.
 *
 * `direction` only picks the wording: money leaving the business ("out", a
 * supplier invoice) versus arriving ("in", an installation).
 */
export async function resolvePayingAccount(
  orgId: string,
  accountId: string | null,
  amountPaid: number,
  direction: "in" | "out" = "out"
): Promise<AccountResolution> {
  if (amountPaid <= 0) {
    return { ok: true, accountId: null };
  }

  const available = await prisma.account.count({ where: { orgId, isActive: true } });
  if (available === 0) {
    return { ok: true, accountId: null };
  }

  if (!accountId) {
    return {
      ok: false,
      error:
        direction === "in"
          ? "Choose which payment method the money went to."
          : "Choose which payment method the money came from.",
    };
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
