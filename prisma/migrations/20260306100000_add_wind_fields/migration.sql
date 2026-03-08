-- AlterTable: Windfelder zu ForestWeatherSnapshot hinzufügen
ALTER TABLE "ForestWeatherSnapshot"
  ADD COLUMN "windAvgKmh" DOUBLE PRECISION,
  ADD COLUMN "windDirDeg" DOUBLE PRECISION,
  ADD COLUMN "isStorm"    BOOLEAN NOT NULL DEFAULT false;
