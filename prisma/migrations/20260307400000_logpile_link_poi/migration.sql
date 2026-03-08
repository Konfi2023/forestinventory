-- Make lat/lng optional on LogPile
ALTER TABLE "LogPile" ALTER COLUMN "lat" DROP NOT NULL;
ALTER TABLE "LogPile" ALTER COLUMN "lng" DROP NOT NULL;

-- Add optional link to ForestPoi
ALTER TABLE "LogPile" ADD COLUMN "forestPoiId" TEXT;
ALTER TABLE "LogPile" ADD CONSTRAINT "LogPile_forestPoiId_fkey"
  FOREIGN KEY ("forestPoiId") REFERENCES "ForestPoi"("id") ON DELETE SET NULL ON UPDATE CASCADE;
