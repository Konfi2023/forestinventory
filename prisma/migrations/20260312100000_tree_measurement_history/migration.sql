-- Migration: Tree measurement history + structured soil/site enums
-- Phase 2: Jede Baum-Messung wird als eigener Datensatz gespeichert

-- ============================================================
-- 1. Neue ENUM-Typen anlegen
-- ============================================================

CREATE TYPE "SoilCondition" AS ENUM ('SANDY', 'LOAMY', 'CLAY', 'HUMUS', 'ROCKY', 'MIXED');
CREATE TYPE "SoilMoisture"  AS ENUM ('DRY', 'FRESH', 'MOIST', 'WET', 'WATERLOGGED');
CREATE TYPE "Exposition"    AS ENUM ('N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'FLAT');
CREATE TYPE "SlopeClass"    AS ENUM ('FLAT', 'MODERATE', 'STEEP', 'VERY_STEEP');
CREATE TYPE "SlopePosition" AS ENUM ('SUMMIT', 'UPPER_SLOPE', 'MID_SLOPE', 'LOWER_SLOPE', 'VALLEY');
CREATE TYPE "StandType"     AS ENUM ('PURE_CONIFER', 'PURE_DECIDUOUS', 'MIXED', 'EDGE', 'CLEARCUT', 'YOUNG_GROWTH');
CREATE TYPE "StockingDegree" AS ENUM ('OPEN', 'SPARSE', 'MEDIUM', 'DENSE', 'VERY_DENSE');

-- ============================================================
-- 2. ForestPoiTree – bestehende String-Spalten zu Enums konvertieren
--    Vorhandene Werte (z.B. 'SANDY', 'DRY') passen direkt.
--    NULL-Werte bleiben NULL.
-- ============================================================

ALTER TABLE "ForestPoiTree"
  ALTER COLUMN "soilCondition" TYPE "SoilCondition"
    USING "soilCondition"::"SoilCondition",
  ALTER COLUMN "soilMoisture"  TYPE "SoilMoisture"
    USING "soilMoisture"::"SoilMoisture";

-- ============================================================
-- 3. ForestPoiTree – neue Spalten hinzufügen
-- ============================================================

ALTER TABLE "ForestPoiTree"
  ADD COLUMN "damageType"     TEXT,
  ADD COLUMN "damageSeverity" INTEGER,
  ADD COLUMN "crownCondition" INTEGER,
  ADD COLUMN "exposition"     "Exposition",
  ADD COLUMN "slopeClass"     "SlopeClass",
  ADD COLUMN "slopePosition"  "SlopePosition",
  ADD COLUMN "standType"      "StandType",
  ADD COLUMN "stockingDegree" "StockingDegree";

-- ============================================================
-- 4. TreeMeasurement – neue Tabelle für Messzeitreihe
-- ============================================================

CREATE TABLE "TreeMeasurement" (
  "id"             TEXT        NOT NULL,
  "poiId"          TEXT        NOT NULL,
  "measuredAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "measuredById"   TEXT,
  "diameter"       DOUBLE PRECISION,
  "height"         DOUBLE PRECISION,
  "age"            INTEGER,
  "co2Storage"     DOUBLE PRECISION,
  "health"         "TreeHealth" NOT NULL DEFAULT 'HEALTHY',
  "damageType"     TEXT,
  "damageSeverity" INTEGER,
  "crownCondition" INTEGER,
  "soilMoisture"   "SoilMoisture",
  "notes"          TEXT,
  "imageKey"       TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TreeMeasurement_pkey" PRIMARY KEY ("id")
);

-- ============================================================
-- 5. Foreign Keys für TreeMeasurement
-- ============================================================

ALTER TABLE "TreeMeasurement"
  ADD CONSTRAINT "TreeMeasurement_poiId_fkey"
    FOREIGN KEY ("poiId") REFERENCES "ForestPoi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TreeMeasurement"
  ADD CONSTRAINT "TreeMeasurement_measuredById_fkey"
    FOREIGN KEY ("measuredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================
-- 6. Index für Zeitreihen-Abfragen
-- ============================================================

CREATE INDEX "TreeMeasurement_poiId_measuredAt_idx"
  ON "TreeMeasurement"("poiId", "measuredAt");
