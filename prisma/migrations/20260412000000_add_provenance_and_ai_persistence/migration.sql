-- Provenienz-Felder an bestehende Snapshot-Modelle

-- ForestBiomassSnapshot
ALTER TABLE "app"."ForestBiomassSnapshot" ADD COLUMN "method" TEXT;
ALTER TABLE "app"."ForestBiomassSnapshot" ADD COLUMN "confidence" DOUBLE PRECISION;
ALTER TABLE "app"."ForestBiomassSnapshot" ADD COLUMN "processedAt" TIMESTAMP(3);
ALTER TABLE "app"."ForestBiomassSnapshot" ADD COLUMN "sceneCount" INTEGER;

-- ForestWeatherSnapshot
ALTER TABLE "app"."ForestWeatherSnapshot" ADD COLUMN "method" TEXT;
ALTER TABLE "app"."ForestWeatherSnapshot" ADD COLUMN "confidence" DOUBLE PRECISION;
ALTER TABLE "app"."ForestWeatherSnapshot" ADD COLUMN "processedAt" TIMESTAMP(3);

-- ForestS1Snapshot
ALTER TABLE "app"."ForestS1Snapshot" ADD COLUMN "method" TEXT;
ALTER TABLE "app"."ForestS1Snapshot" ADD COLUMN "confidence" DOUBLE PRECISION;
ALTER TABLE "app"."ForestS1Snapshot" ADD COLUMN "processedAt" TIMESTAMP(3);

-- ForestPolygonSnapshot
ALTER TABLE "app"."ForestPolygonSnapshot" ADD COLUMN "method" TEXT;
ALTER TABLE "app"."ForestPolygonSnapshot" ADD COLUMN "confidence" DOUBLE PRECISION;
ALTER TABLE "app"."ForestPolygonSnapshot" ADD COLUMN "processedAt" TIMESTAMP(3);

-- TreeMeasurement
ALTER TABLE "app"."TreeMeasurement" ADD COLUMN "source" TEXT;
ALTER TABLE "app"."TreeMeasurement" ADD COLUMN "method" TEXT;
ALTER TABLE "app"."TreeMeasurement" ADD COLUMN "confidence" DOUBLE PRECISION;

-- Neues Modell: AiTreeAnalysis
CREATE TABLE "app"."AiTreeAnalysis" (
    "id" TEXT NOT NULL,
    "poiId" TEXT NOT NULL,
    "analysisType" TEXT NOT NULL,
    "scientificName" TEXT,
    "speciesId" TEXT,
    "speciesLabel" TEXT,
    "speciesConfidence" DOUBLE PRECISION,
    "diameterCm" INTEGER,
    "heightM" INTEGER,
    "crownDefoliation" INTEGER,
    "crownCondition" INTEGER,
    "crownForm" TEXT,
    "health" TEXT,
    "damageType" TEXT,
    "damageSeverity" INTEGER,
    "reasoning" TEXT,
    "aiModel" TEXT NOT NULL DEFAULT 'gpt-4o',
    "imageKey" TEXT,
    "source" TEXT NOT NULL DEFAULT 'GPT4O_VISION',
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiTreeAnalysis_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiTreeAnalysis_poiId_analysisType_idx" ON "app"."AiTreeAnalysis"("poiId", "analysisType");
CREATE INDEX "AiTreeAnalysis_poiId_createdAt_idx" ON "app"."AiTreeAnalysis"("poiId", "createdAt");

ALTER TABLE "app"."AiTreeAnalysis" ADD CONSTRAINT "AiTreeAnalysis_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "app"."ForestPoi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Neues Modell: ForestAiBiomassReport
CREATE TABLE "app"."ForestAiBiomassReport" (
    "id" TEXT NOT NULL,
    "forestId" TEXT NOT NULL,
    "reportMonth" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "takeaways" JSONB NOT NULL,
    "aiModel" TEXT NOT NULL DEFAULT 'gpt-4o',
    "source" TEXT NOT NULL DEFAULT 'GPT4O_NDVI_WEATHER',
    "ndviValue" DOUBLE PRECISION,
    "inputData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForestAiBiomassReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ForestAiBiomassReport_forestId_reportMonth_key" ON "app"."ForestAiBiomassReport"("forestId", "reportMonth");
CREATE INDEX "ForestAiBiomassReport_forestId_reportMonth_idx" ON "app"."ForestAiBiomassReport"("forestId", "reportMonth");

ALTER TABLE "app"."ForestAiBiomassReport" ADD CONSTRAINT "ForestAiBiomassReport_forestId_fkey" FOREIGN KEY ("forestId") REFERENCES "app"."Forest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
