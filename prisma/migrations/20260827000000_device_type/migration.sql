-- AlterTable
ALTER TABLE "devices" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'device';

-- Backfill: the one existing bulk SIM pool becomes type='sim' by name, one
-- time only — everything else (the bulk tracker pool and any legacy per-IMEI
-- rows) defaults to 'device' from the column default above. Going forward,
-- `type` is what identifies the pool, not `fm_module`.
UPDATE "devices" SET "type" = 'sim' WHERE fm_module ILIKE 'sim';
