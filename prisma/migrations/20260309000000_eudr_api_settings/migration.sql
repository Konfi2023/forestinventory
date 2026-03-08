-- EUDR API settings on Organization
ALTER TABLE "Organization"
  ADD COLUMN IF NOT EXISTS "eudrApiUrl"         TEXT,
  ADD COLUMN IF NOT EXISTS "eudrApiUsername"     TEXT,
  ADD COLUMN IF NOT EXISTS "eudrApiPassword"     TEXT,
  ADD COLUMN IF NOT EXISTS "eudrApiClientId"     TEXT DEFAULT 'eudr-test',
  ADD COLUMN IF NOT EXISTS "eudrApiEnvironment"  TEXT DEFAULT 'ACCEPTANCE',
  ADD COLUMN IF NOT EXISTS "eudrApiEnabled"      BOOLEAN NOT NULL DEFAULT FALSE;

-- Extra fields on DueDiligenceStatement
ALTER TABLE "DueDiligenceStatement"
  ADD COLUMN IF NOT EXISTS "verificationNumber"  TEXT,
  ADD COLUMN IF NOT EXISTS "tracesNtId"          TEXT,
  ADD COLUMN IF NOT EXISTS "harvestStartDate"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "harvestEndDate"      TIMESTAMP(3);
