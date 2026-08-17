-- Applied by hand with `prisma db execute` — this database's migration history
-- has drifted, so `prisma migrate dev` offers only a destructive reset.
-- Purely additive: one new table, nothing existing is altered or dropped.
--
-- An installation can carry several devices, so the single installations.device_id
-- is no longer enough. That column stays, holding the first fitted device, so
-- every existing row and read path keeps working.

-- ids are TEXT throughout this schema (Prisma's default for String @id), not UUID
CREATE TABLE IF NOT EXISTS installation_devices (
  id              TEXT PRIMARY KEY,
  installation_id TEXT NOT NULL REFERENCES installations (id) ON DELETE CASCADE,
  device_id       TEXT NOT NULL REFERENCES devices (id),
  quantity        INTEGER NOT NULL DEFAULT 1,
  unit_price      DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS installation_devices_installation_id_idx
  ON installation_devices (installation_id);

CREATE INDEX IF NOT EXISTS installation_devices_device_id_idx
  ON installation_devices (device_id);
