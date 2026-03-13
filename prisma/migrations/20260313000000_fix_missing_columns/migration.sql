-- Fix schema drift: add columns that exist in schema.prisma but were missing from migrations

-- Forest: add color
ALTER TABLE "Forest" ADD COLUMN IF NOT EXISTS "color" TEXT DEFAULT '#10b981';

-- ForestPath: add color
ALTER TABLE "ForestPath" ADD COLUMN IF NOT EXISTS "color" TEXT;

-- ForestPoiTree: add imageKey
ALTER TABLE "ForestPoiTree" ADD COLUMN IF NOT EXISTS "imageKey" TEXT;

-- Task: add poiId + FK
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "poiId" TEXT;
ALTER TABLE "Task" ADD CONSTRAINT "Task_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "ForestPoi"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ForestBiomassSnapshot: create table if missing
CREATE TABLE IF NOT EXISTS "ForestBiomassSnapshot" (
    "id" TEXT NOT NULL,
    "forestId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "meanNdvi" DOUBLE PRECISION,
    "minNdvi" DOUBLE PRECISION,
    "maxNdvi" DOUBLE PRECISION,
    "cloudPct" DOUBLE PRECISION,
    "source" TEXT NOT NULL DEFAULT 'SENTINEL2_L2A',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ForestBiomassSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ForestBiomassSnapshot_forestId_date_idx" ON "ForestBiomassSnapshot"("forestId", "date");
ALTER TABLE "ForestBiomassSnapshot" ADD CONSTRAINT "ForestBiomassSnapshot_forestId_fkey" FOREIGN KEY ("forestId") REFERENCES "Forest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
