-- CreateTable: InventoryPlot
CREATE TABLE "InventoryPlot" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "radiusM" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "measuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "measuredById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "forestId" TEXT NOT NULL,
    "compartmentId" TEXT,

    CONSTRAINT "InventoryPlot_pkey" PRIMARY KEY ("id")
);

-- AddColumn: plotId to ForestPoiTree
ALTER TABLE "ForestPoiTree" ADD COLUMN "plotId" TEXT;

-- CreateIndex
CREATE INDEX "InventoryPlot_forestId_idx" ON "InventoryPlot"("forestId");
CREATE INDEX "InventoryPlot_compartmentId_idx" ON "InventoryPlot"("compartmentId");
CREATE INDEX "ForestPoiTree_plotId_idx" ON "ForestPoiTree"("plotId");

-- AddForeignKey
ALTER TABLE "InventoryPlot" ADD CONSTRAINT "InventoryPlot_measuredById_fkey"
    FOREIGN KEY ("measuredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "InventoryPlot" ADD CONSTRAINT "InventoryPlot_forestId_fkey"
    FOREIGN KEY ("forestId") REFERENCES "Forest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryPlot" ADD CONSTRAINT "InventoryPlot_compartmentId_fkey"
    FOREIGN KEY ("compartmentId") REFERENCES "ForestCompartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ForestPoiTree" ADD CONSTRAINT "ForestPoiTree_plotId_fkey"
    FOREIGN KEY ("plotId") REFERENCES "InventoryPlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
