-- CreateTable: ForestPoiLogPile (Holzpolter-Details zu einem POI)
-- Hinweis: treeSpecies, woodType, qualityClass werden in 20260307500000_logpile_poi_extra_fields ergänzt
CREATE TABLE "ForestPoiLogPile" (
    "id" TEXT NOT NULL,
    "poiId" TEXT NOT NULL,
    "volumeFm" DOUBLE PRECISION,
    "logLength" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForestPoiLogPile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ForestPoiLogPile_poiId_key" ON "ForestPoiLogPile"("poiId");

-- AddForeignKey
ALTER TABLE "ForestPoiLogPile" ADD CONSTRAINT "ForestPoiLogPile_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "ForestPoi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
