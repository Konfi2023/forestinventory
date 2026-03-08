-- AlterTable ForestPlanting: add trackBiomass
ALTER TABLE "ForestPlanting" ADD COLUMN "trackBiomass" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable ForestCalamity: add trackBiomass
ALTER TABLE "ForestCalamity" ADD COLUMN "trackBiomass" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable ForestPolygonSnapshot
CREATE TABLE "ForestPolygonSnapshot" (
    "id" TEXT NOT NULL,
    "polygonId" TEXT NOT NULL,
    "polygonType" TEXT NOT NULL,
    "forestId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "vhMeanDb" DOUBLE PRECISION,
    "vvMeanDb" DOUBLE PRECISION,
    "changeDb" DOUBLE PRECISION,
    "baselineDb" DOUBLE PRECISION,
    "isAnomaly" BOOLEAN NOT NULL DEFAULT false,
    "sceneCount" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL DEFAULT 'SENTINEL1_GRD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForestPolygonSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ForestPolygonSnapshot_polygonId_date_key" ON "ForestPolygonSnapshot"("polygonId", "date");

-- CreateIndex
CREATE INDEX "ForestPolygonSnapshot_polygonId_date_idx" ON "ForestPolygonSnapshot"("polygonId", "date");

-- CreateIndex
CREATE INDEX "ForestPolygonSnapshot_polygonType_isAnomaly_idx" ON "ForestPolygonSnapshot"("polygonType", "isAnomaly");

-- AddForeignKey
ALTER TABLE "ForestPolygonSnapshot" ADD CONSTRAINT "ForestPolygonSnapshot_forestId_fkey" FOREIGN KEY ("forestId") REFERENCES "Forest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
