-- CreateTable
CREATE TABLE "installation_payments" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "installation_id" TEXT NOT NULL,
    "account_id" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "installation_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "installation_payments_installation_id_idx" ON "installation_payments"("installation_id");

-- CreateIndex
CREATE INDEX "installation_payments_account_id_idx" ON "installation_payments"("account_id");

-- AddForeignKey
ALTER TABLE "installation_payments" ADD CONSTRAINT "installation_payments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installation_payments" ADD CONSTRAINT "installation_payments_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "installations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installation_payments" ADD CONSTRAINT "installation_payments_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: every installation that already has money paid against it gets a
-- single payment record dated to its own installation_date, using whatever
-- account_id it currently carries. This is the one-time bridge from the old
-- "totalAmount added in full once accountId is set" balance model to the new
-- one that sums real payment records — without this, every account balance
-- would drop to 0 the moment payment-methods/page.tsx switches over.
INSERT INTO "installation_payments" ("id", "org_id", "installation_id", "account_id", "amount", "paid_at")
SELECT
    gen_random_uuid(),
    "org_id",
    "id",
    "account_id",
    "amount_paid",
    "installation_date"::timestamp
FROM "installations"
WHERE "amount_paid" > 0;
