-- Applied by hand with `prisma db execute` — see 20260806_installation_devices.sql
-- for why (this database's migration history has drifted from `prisma migrate dev`).
-- Purely additive: one nullable column, nothing existing is altered or dropped.

-- Lets a purchase invoice record which payment method the "amount paid now"
-- came out of, the same way supplier_payments.account_id already does.
ALTER TABLE purchase_invoices
  ADD COLUMN IF NOT EXISTS account_id TEXT REFERENCES accounts (id);
