-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('EXCAVATOR', 'HARVESTER', 'FORWARDER', 'TRACTOR', 'SKIDDER', 'CRANE_TRUCK', 'MULCHER', 'CHAINSAW', 'TRAILER', 'OTHER');

-- CreateEnum
CREATE TYPE "TreeHealth" AS ENUM ('HEALTHY', 'DAMAGED', 'DEAD');

-- CreateTable
CREATE TABLE "ForestPoiVehicle" (
    "id" TEXT NOT NULL,
    "poiId" TEXT NOT NULL,
    "vehicleType" "VehicleType" NOT NULL DEFAULT 'OTHER',
    "serialNumber" TEXT,
    "yearBuilt" INTEGER,
    "lastInspection" TIMESTAMP(3),
    "nextInspection" TIMESTAMP(3),
    "imageKey" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForestPoiVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForestPoiTree" (
    "id" TEXT NOT NULL,
    "poiId" TEXT NOT NULL,
    "species" TEXT,
    "age" INTEGER,
    "diameter" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "co2Storage" DOUBLE PRECISION,
    "health" "TreeHealth" NOT NULL DEFAULT 'HEALTHY',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForestPoiTree_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ForestPoiVehicle_poiId_key" ON "ForestPoiVehicle"("poiId");

-- CreateIndex
CREATE INDEX "ForestPoiVehicle_nextInspection_idx" ON "ForestPoiVehicle"("nextInspection");

-- CreateIndex
CREATE UNIQUE INDEX "ForestPoiTree_poiId_key" ON "ForestPoiTree"("poiId");

-- CreateIndex
CREATE INDEX "ForestPoiTree_species_idx" ON "ForestPoiTree"("species");

-- AddForeignKey
ALTER TABLE "ForestPoiVehicle" ADD CONSTRAINT "ForestPoiVehicle_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "ForestPoi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForestPoiTree" ADD CONSTRAINT "ForestPoiTree_poiId_fkey" FOREIGN KEY ("poiId") REFERENCES "ForestPoi"("id") ON DELETE CASCADE ON UPDATE CASCADE;
