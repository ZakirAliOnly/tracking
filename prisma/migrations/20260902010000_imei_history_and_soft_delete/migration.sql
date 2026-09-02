-- AlterTable: soft-delete flag on installations
ALTER TABLE "installations" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- CreateTable: append-only IMEI change audit log
CREATE TABLE "imei_change_logs" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "installation_id" TEXT NOT NULL,
    "old_imei" TEXT,
    "new_imei" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "imei_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "imei_change_logs_installation_id_idx" ON "imei_change_logs"("installation_id");

-- AddForeignKey
ALTER TABLE "imei_change_logs" ADD CONSTRAINT "imei_change_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "imei_change_logs" ADD CONSTRAINT "imei_change_logs_installation_id_fkey" FOREIGN KEY ("installation_id") REFERENCES "installations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
