ALTER TABLE "Operation"
  ADD COLUMN IF NOT EXISTS "calamityId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Operation_calamityId_key"
  ON "Operation"("calamityId");

ALTER TABLE "Operation"
  ADD CONSTRAINT IF NOT EXISTS "Operation_calamityId_fkey"
  FOREIGN KEY ("calamityId") REFERENCES "ForestCalamity"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
