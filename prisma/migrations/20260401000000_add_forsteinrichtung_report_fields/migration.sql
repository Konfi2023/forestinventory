-- ForestCompartment: Standort-Erweiterung
ALTER TABLE "ForestCompartment" ADD COLUMN "altitude" INTEGER;
ALTER TABLE "ForestCompartment" ADD COLUMN "siteUnit" TEXT;
ALTER TABLE "ForestCompartment" ADD COLUMN "forestFunction" TEXT;

-- ForestCompartment: Planung
ALTER TABLE "ForestCompartment" ADD COLUMN "plannedMeasures" JSONB;
ALTER TABLE "ForestCompartment" ADD COLUMN "plannedHarvestVolume" DOUBLE PRECISION;
ALTER TABLE "ForestCompartment" ADD COLUMN "standTypeCode" TEXT;

-- Forest: Planungszeitraum + Nutzungssatz
ALTER TABLE "Forest" ADD COLUMN "planningPeriodStart" INTEGER;
ALTER TABLE "Forest" ADD COLUMN "planningPeriodEnd" INTEGER;
ALTER TABLE "Forest" ADD COLUMN "annualHarvestTarget" DOUBLE PRECISION;
