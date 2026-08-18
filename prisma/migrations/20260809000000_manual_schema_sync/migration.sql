-- DropIndex
DROP INDEX "public"."devices_org_id_imei_no_key";

-- AlterTable
ALTER TABLE "public"."accounts" ADD COLUMN     "opening_balance" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."devices" ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sale_price" DECIMAL(12,2),
ALTER COLUMN "imei_no" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."installations" ADD COLUMN     "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "received" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sim_no" TEXT,
ALTER COLUMN "device_id" DROP NOT NULL;

-- total_amount is a computed column, not a plain one with a default — a
-- generated column can't be altered in place, so it is dropped and recreated
ALTER TABLE "public"."installations" DROP COLUMN "total_amount";
ALTER TABLE "public"."installations" ADD COLUMN "total_amount" DECIMAL(12,2) GENERATED ALWAYS AS (
  ((COALESCE(installation_pay, (0)::numeric) + COALESCE(sim_payment, (0)::numeric)) + COALESCE(device_payment, (0)::numeric)) + COALESCE(net_payment, (0)::numeric)
) STORED;

-- AlterTable
ALTER TABLE "public"."suppliers" ADD COLUMN     "address" VARCHAR,
ADD COLUMN     "opening_owed" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "public"."fund_transfers" (
    "id" VARCHAR NOT NULL,
    "org_id" VARCHAR NOT NULL,
    "from_id" VARCHAR NOT NULL,
    "to_id" VARCHAR NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "transferred_at" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fund_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."installation_devices" (
    "id" TEXT NOT NULL,
    "installation_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "installation_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_invoices" (
    "id" VARCHAR NOT NULL,
    "org_id" VARCHAR NOT NULL,
    "supplier_id" VARCHAR NOT NULL,
    "device_id" VARCHAR NOT NULL,
    "quantity" INTEGER NOT NULL,
    "cost_price" DECIMAL(12,2) NOT NULL,
    "sale_price" DECIMAL(12,2),
    "total_amount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "invoice_date" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "account_id" TEXT,

    CONSTRAINT "purchase_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."supplier_payments" (
    "id" VARCHAR NOT NULL,
    "org_id" VARCHAR NOT NULL,
    "supplier_id" VARCHAR NOT NULL,
    "account_id" VARCHAR,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "paid_at" DATE NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "installation_devices_device_id_idx" ON "public"."installation_devices"("device_id" ASC);

-- CreateIndex
CREATE INDEX "installation_devices_installation_id_idx" ON "public"."installation_devices"("installation_id" ASC);

-- AddForeignKey
ALTER TABLE "public"."fund_transfers" ADD CONSTRAINT "fund_transfers_from_id_fkey" FOREIGN KEY ("from_id") REFERENCES "public"."accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."fund_transfers" ADD CONSTRAINT "fund_transfers_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."fund_transfers" ADD CONSTRAINT "fund_transfers_to_id_fkey" FOREIGN KEY ("to_id") REFERENCES "public"."accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."installation_devices" ADD CONSTRAINT "installation_devices_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."installation_devices" ADD CONSTRAINT "installation_devices_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "public"."installations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."purchase_invoices" ADD CONSTRAINT "purchase_invoices_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."purchase_invoices" ADD CONSTRAINT "purchase_invoices_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."purchase_invoices" ADD CONSTRAINT "purchase_invoices_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."purchase_invoices" ADD CONSTRAINT "purchase_invoices_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."supplier_payments" ADD CONSTRAINT "supplier_payments_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."supplier_payments" ADD CONSTRAINT "supplier_payments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."supplier_payments" ADD CONSTRAINT "supplier_payments_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

