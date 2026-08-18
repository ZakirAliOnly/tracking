import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { RENEWAL_REMINDER_DAYS } from "@/lib/utils";
import { PAGE_SIZE, pageWindow } from "@/lib/pagination";
import type { RenewalRow, RenewalStatus } from "@/components/renewals/RenewalsView";

export type RenewalFilter = "pending" | "received" | "all";

/** An open-ended due-date window. Either end may be absent. */
export type RenewalRange = { from: string | null; to: string | null };

/**
 * Whether an installation's current cycle already has a received renewal
 * takes priority over its due date — an installation that is overdue by date
 * but was already paid for this cycle displays as "received", not "overdue".
 * That is a same-row comparison against the *latest* renewal record, which
 * Prisma's query API cannot express as a `where` filter, so filtering,
 * counting and paging all happen in one raw query rather than approximating
 * it with a plain column comparison. Verified row-for-row against the
 * previous full-scan JS logic before replacing it.
 *
 * "Pending" is simply everything not yet received — overdue, due soon and
 * far-off alike — so nothing unpaid can hide behind a date threshold.
 */
function filterCondition(filter: RenewalFilter): Prisma.Sql {
  if (filter === "pending") return Prisma.sql`NOT is_received`;
  if (filter === "received") return Prisma.sql`is_received`;
  return Prisma.sql`TRUE`;
}

/** Narrows to renewals falling due inside the window; both ends inclusive. */
function rangeCondition(range: RenewalRange): Prisma.Sql {
  const clauses: Prisma.Sql[] = [];
  if (range.from) clauses.push(Prisma.sql`next_renewal_date::date >= ${range.from}::date`);
  if (range.to) clauses.push(Prisma.sql`next_renewal_date::date <= ${range.to}::date`);
  if (clauses.length === 0) return Prisma.sql`TRUE`;
  return Prisma.join(clauses, " AND ");
}

/** The `next_renewal_date` column is only in scope inside `base`, so counts repeat it. */
function whereFor(filter: RenewalFilter, range: RenewalRange): Prisma.Sql {
  return Prisma.sql`${filterCondition(filter)} AND ${rangeCondition(range)}`;
}

// `today` is computed in JS (server-local midnight) and passed in rather than
// using Postgres's own CURRENT_DATE, so the displayed "days until due" always
// agrees with the app's own notion of today regardless of the DB server's
// timezone.
function todayParam(): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString().slice(0, 10);
}

type RawRow = {
  id: string;
  next_renewal_date: Date;
  installation_pay: Prisma.Decimal;
  sim_payment: Prisma.Decimal;
  net_payment: Prisma.Decimal;
  account_id: string | null;
  customer_name: string;
  registration_no: string;
  account_name: string | null;
  last_amount: Prisma.Decimal | null;
  last_sim_osting: Prisma.Decimal | null;
  last_net: Prisma.Decimal | null;
  last_other: Prisma.Decimal | null;
  days_until_due: number;
  status: RenewalStatus;
};

function toRow(r: RawRow): RenewalRow {
  return {
    installationId: r.id,
    customerName: r.customer_name,
    registrationNo: r.registration_no,
    dueDateIso: r.next_renewal_date.toISOString(),
    accountName: r.account_name,
    accountId: r.account_id,
    status: r.status,
    daysUntilDue: r.days_until_due,
    amount: r.last_amount?.toString() ?? null,
    simOsting: r.last_sim_osting?.toString() ?? null,
    net: r.last_net?.toString() ?? null,
    other: r.last_other?.toString() ?? null,
    prefillAmount: r.last_amount?.toString() ?? r.installation_pay.toString(),
    prefillSimOsting: r.last_sim_osting?.toString() ?? r.sim_payment.toString(),
    prefillNet: r.last_net?.toString() ?? r.net_payment.toString(),
    nextRenewalDateIso: r.next_renewal_date.toISOString(),
  };
}

export async function fetchRenewalRows(
  orgId: string,
  filter: RenewalFilter,
  range: RenewalRange,
  page: number
): Promise<{ rows: RenewalRow[]; total: number; dueSoonCount: number }> {
  const { skip, take } = pageWindow(page, PAGE_SIZE);

  const [rawRows, countRows, dueSoonRows] = await Promise.all([
    prisma.$queryRaw<RawRow[]>(Prisma.sql`
      WITH latest_renewal AS (
        SELECT DISTINCT ON (installation_id) *
        FROM renewals
        ORDER BY installation_id, created_at DESC
      ),
      base AS (
        SELECT
          i.id,
          i.next_renewal_date,
          i.installation_pay,
          i.sim_payment,
          i.net_payment,
          i.account_id,
          c.name AS customer_name,
          v.registration_no,
          a.name AS account_name,
          lr.amount AS last_amount,
          lr.sim_osting AS last_sim_osting,
          lr.net AS last_net,
          lr.other AS last_other,
          (lr.received IS TRUE AND lr.next_renewal_date = i.next_renewal_date) AS is_received,
          (i.next_renewal_date::date - ${todayParam()}::date) AS days_until_due
        FROM installations i
        JOIN customers c ON c.id = i.customer_id
        JOIN vehicles v ON v.id = i.vehicle_id
        LEFT JOIN accounts a ON a.id = i.account_id
        LEFT JOIN latest_renewal lr ON lr.installation_id = i.id
        WHERE i.org_id = ${orgId} AND i.status = 'active'
      )
      SELECT *,
        CASE
          WHEN is_received THEN 'received'
          WHEN days_until_due < 0 THEN 'overdue'
          WHEN days_until_due <= ${RENEWAL_REMINDER_DAYS} THEN 'due_soon'
          ELSE 'upcoming'
        END AS status
      FROM base
      WHERE ${whereFor(filter, range)}
      ORDER BY next_renewal_date ASC
      LIMIT ${take} OFFSET ${skip}
    `),
    prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      WITH latest_renewal AS (
        SELECT DISTINCT ON (installation_id) *
        FROM renewals
        ORDER BY installation_id, created_at DESC
      ),
      base AS (
        SELECT
          i.next_renewal_date,
          (lr.received IS TRUE AND lr.next_renewal_date = i.next_renewal_date) AS is_received,
          (i.next_renewal_date::date - ${todayParam()}::date) AS days_until_due
        FROM installations i
        LEFT JOIN latest_renewal lr ON lr.installation_id = i.id
        WHERE i.org_id = ${orgId} AND i.status = 'active'
      )
      SELECT COUNT(*) AS count FROM base WHERE ${whereFor(filter, range)}
    `),
    // The "needs attention" figure behind the banner and the Pending badge:
    // deliberately org-wide and ignoring the date range, since it is a standing
    // alert about everything overdue or falling due soon, not a view of the
    // window currently being browsed
    prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      WITH latest_renewal AS (
        SELECT DISTINCT ON (installation_id) *
        FROM renewals
        ORDER BY installation_id, created_at DESC
      ),
      base AS (
        SELECT
          (lr.received IS TRUE AND lr.next_renewal_date = i.next_renewal_date) AS is_received,
          (i.next_renewal_date::date - ${todayParam()}::date) AS days_until_due
        FROM installations i
        LEFT JOIN latest_renewal lr ON lr.installation_id = i.id
        WHERE i.org_id = ${orgId} AND i.status = 'active'
      )
      SELECT COUNT(*) AS count FROM base
      WHERE NOT is_received AND days_until_due <= ${RENEWAL_REMINDER_DAYS}
    `),
  ]);

  return {
    rows: rawRows.map(toRow),
    total: Number(countRows[0]?.count ?? 0),
    dueSoonCount: Number(dueSoonRows[0]?.count ?? 0),
  };
}
