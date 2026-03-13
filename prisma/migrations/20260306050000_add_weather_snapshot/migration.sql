-- CreateTable: Tägliche Wetterdaten pro Wald (Open-Meteo)
-- Hinweis: windAvgKmh, windDirDeg, isStorm werden in 20260306100000_add_wind_fields ergänzt
CREATE TABLE "ForestWeatherSnapshot" (
    "id" TEXT NOT NULL,
    "forestId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "maxTempC" DOUBLE PRECISION,
    "minTempC" DOUBLE PRECISION,
    "avgTempC" DOUBLE PRECISION,
    "precipMm" DOUBLE PRECISION,
    "et0Mm" DOUBLE PRECISION,
    "waterBalanceMm" DOUBLE PRECISION,
    "windMaxKmh" DOUBLE PRECISION,
    "sunshineDurationH" DOUBLE PRECISION,
    "soilMoisture" DOUBLE PRECISION,
    "isFrost" BOOLEAN NOT NULL DEFAULT false,
    "isHeatStress" BOOLEAN NOT NULL DEFAULT false,
    "barkBeetleRisk" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'OPEN_METEO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ForestWeatherSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ForestWeatherSnapshot_forestId_date_key" ON "ForestWeatherSnapshot"("forestId", "date");

-- CreateIndex
CREATE INDEX "ForestWeatherSnapshot_forestId_date_idx" ON "ForestWeatherSnapshot"("forestId", "date");

-- AddForeignKey
ALTER TABLE "ForestWeatherSnapshot" ADD CONSTRAINT "ForestWeatherSnapshot_forestId_fkey" FOREIGN KEY ("forestId") REFERENCES "Forest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
