-- Extend TransportTicket with carrier, forest measurement, EUDR reference, notes, updatedAt
ALTER TABLE "TransportTicket"
  ADD COLUMN IF NOT EXISTS "carrierName"   TEXT,
  ADD COLUMN IF NOT EXISTS "forestAmount"  DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "forestUnit"    TEXT DEFAULT 'fm',
  ADD COLUMN IF NOT EXISTS "eudrReference" TEXT,
  ADD COLUMN IF NOT EXISTS "note"          TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Make factoryUnit optional with default (was NOT NULL without default)
ALTER TABLE "TransportTicket"
  ALTER COLUMN "factoryUnit" SET DEFAULT 'fm';
