-- CreateTable
CREATE TABLE "ForestS1Snapshot" (
    "id" TEXT NOT NULL,
    "forestId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "vhMean" DOUBLE PRECISION,
    "vhStd" DOUBLE PRECISION,
    "vhMeanDb" DOUBLE PRECISION,
    "vvMean" DOUBLE PRECISION,
    "vvStd" DOUBLE PRECISION,
    "vvMeanDb" DOUBLE PRECISION,
    "ratio" DOUBLE PRECISION,
    "baselineDb" DOUBLE PRECISION,
    "changeDb" DOUBLE PRECISION,
    "isAnomaly" BOOLEAN NOT NULL DEFAULT false,
    "sceneCount" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL DEFAULT 'SENTINEL1_GRD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForestS1Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ForestS1Snapshot_forestId_date_key" ON "ForestS1Snapshot"("forestId", "date");

-- CreateIndex
CREATE INDEX "ForestS1Snapshot_forestId_date_idx" ON "ForestS1Snapshot"("forestId", "date");

-- CreateIndex
CREATE INDEX "ForestS1Snapshot_isAnomaly_idx" ON "ForestS1Snapshot"("isAnomaly");

-- AddForeignKey
ALTER TABLE "ForestS1Snapshot" ADD CONSTRAINT "ForestS1Snapshot_forestId_fkey" FOREIGN KEY ("forestId") REFERENCES "Forest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
