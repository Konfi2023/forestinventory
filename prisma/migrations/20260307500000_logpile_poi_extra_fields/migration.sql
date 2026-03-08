-- Add Baumart/Holzart/Qualität to ForestPoiLogPile
ALTER TABLE "ForestPoiLogPile" ADD COLUMN "treeSpecies"  TEXT;
ALTER TABLE "ForestPoiLogPile" ADD COLUMN "woodType"     TEXT DEFAULT 'LOG';
ALTER TABLE "ForestPoiLogPile" ADD COLUMN "qualityClass" TEXT;
